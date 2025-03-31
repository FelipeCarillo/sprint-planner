// SprintPlannerPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Button,
  Grid,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Importar os serviços de API ao invés de usar axios diretamente
import { sprintService, workItemService, developerService } from './service/api';


// Mapeamento de cores para status
const statusColors = {
  'New': '#3f51b5',       // Azul
  'Active': '#4caf50',    // Verde
  'Resolved': '#ff9800',  // Laranja
  'In Progress': '#9c27b0', // Roxo
  'default': '#607d8b'    // Cinza azulado
};
// Definir alturas específicas para garantir consistência
const HEADER_SPRINT_HEIGHT = 48; // altura do cabeçalho de sprint
const HEADER_WEEK_HEIGHT = 48; // altura do cabeçalho de semana
const HEADER_TOTAL_HEIGHT = HEADER_SPRINT_HEIGHT + HEADER_WEEK_HEIGHT; // altura total do cabeçalho
const CELL_HEIGHT = 72; // altura em pixels para todas as células

const SprintPlannerPage = () => {
  // Estados para dados da API
  const [sprints, setSprints] = useState([]);
  const [workItems, setWorkItems] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [allocations, setAllocations] = useState({});

  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Estado para drag & drop
  const [draggingProject, setDraggingProject] = useState(null);
  const [draggingSourceCell, setDraggingSourceCell] = useState(null);
  const [expandedCells, setExpandedCells] = useState({});

  // Carregar dados iniciais
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Buscar todas as fontes de dados em paralelo usando os serviços
        const [sprintsRes, workItemsRes, developersRes, allocationsRes] = await Promise.all([
          sprintService.getAll(),
          workItemService.getAll(),
          developerService.getAll(),
          developerService.getAllocations()
        ]);

        setSprints(sprintsRes.data.sprints);
        setWorkItems(workItemsRes.data.work_items);
        setDevelopers(developersRes.data.developers);

        // Converter alocações do formato da API para o formato do componente
        const allocationMap = {};
        allocationsRes.data.allocations.forEach(allocation => {
          const cellId = getCellId(allocation.developer_id, allocation.week_index);
          const workItem = workItemsRes.data.work_items.find(item => item.id === allocation.work_item_id);
          if (workItem) {
            allocationMap[cellId] = workItem;
          }
        });

        setAllocations(allocationMap);
        updateExpandedCells(allocationMap);

        setNotification({
          open: true,
          message: 'Dados carregados com sucesso',
          severity: 'success'
        });
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Falha ao carregar dados. Verifique a conexão com a API.');
        setNotification({
          open: true,
          message: 'Erro ao carregar dados',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calcular semanas para exibição
  const calculateWeekPeriods = () => {
    if (!sprints || sprints.length === 0) return [];

    const periods = [];
    const totalWeeks = 16; // Podemos calcular baseado no período das sprints

    // Usar a data de início da primeira sprint
    let startDate = new Date(sprints[0].start_date);

    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const formatDate = (date) => {
        return `${date.getDate()}/${date.getMonth() + 1}`;
      };

      periods.push(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`);
    }

    return periods;
  };

  const weekPeriods = calculateWeekPeriods();
  const totalWeeks = weekPeriods.length || 16;
  const weeksPerSprint = 2; // Podemos calcular dinamicamente das datas das sprints
  const totalSprints = Math.ceil(totalWeeks / weeksPerSprint);

  // Generate a unique ID for the cell (droppable area)
  const getCellId = (devId, weekIndex) => {
    return `cell-${devId}-w${weekIndex}`;
  };

  // Get developer ID and week index from a cell ID
  const parseCellId = (cellId) => {
    const match = cellId.match(/cell-(dev-\d+)-w(\d+)/);
    if (match) {
      return {
        devId: match[1],
        weekIndex: parseInt(match[2])
      };
    }
    return null;
  };

  // Update expanded cells based on allocations
  const updateExpandedCells = (allocationMap) => {
    const newExpandedCells = {};
    const currentAllocations = allocationMap || allocations;

    Object.entries(currentAllocations).forEach(([cellId, workItem]) => {
      // Extract the developer ID and week index from the cell ID
      const cellInfo = parseCellId(cellId);
      if (cellInfo) {
        const { devId, weekIndex } = cellInfo;

        // Mark subsequent cells as expanded
        for (let i = 1; i < workItem.estimated_weeks; i++) {
          const expandedCellId = getCellId(devId, weekIndex + i);
          newExpandedCells[expandedCellId] = {
            sourceId: cellId,
            project: workItem
          };
        }
      }
    });

    setExpandedCells(newExpandedCells);
  };

  useEffect(() => {
    updateExpandedCells();
  }, [allocations]);

  // Check if a cell is part of a specific project
  const isCellPartOfProject = (devId, weekIndex, projectId) => {
    // Check if this cell is the start of the project
    const cellId = getCellId(devId, weekIndex);
    if (allocations[cellId] && allocations[cellId].id === projectId) {
      return true;
    }

    // Check if this cell is part of an expanded project
    if (expandedCells[cellId] && expandedCells[cellId].project.id === projectId) {
      return true;
    }

    return false;
  };

  // Check if a cell is available for dropping
  const isCellAvailableForProject = (devId, weekIndex, project, currentProjectId = null) => {
    const cellId = getCellId(devId, weekIndex);

    // Check if this cell is already allocated
    if (allocations[cellId]) {
      // If it's allocated to the same project we're moving, that's okay
      if (currentProjectId && allocations[cellId].id === currentProjectId) {
        return true;
      }
      return false;
    }

    // Check if this cell is part of an expanded project
    if (expandedCells[cellId]) {
      // If it's part of the same project we're moving, that's okay
      if (currentProjectId && expandedCells[cellId].project.id === currentProjectId) {
        return true;
      }
      return false;
    }

    return true;
  };

  // Find the current location of a project
  const findProjectLocation = (projectId) => {
    // Check allocations for the project
    const cellId = Object.keys(allocations).find(
      key => allocations[key] && allocations[key].id === projectId
    );

    if (cellId) {
      const cellInfo = parseCellId(cellId);
      if (cellInfo) {
        return {
          cellId,
          devId: cellInfo.devId,
          weekIndex: cellInfo.weekIndex
        };
      }
    }

    return null;
  };

  // Handle drag start
  const handleDragStart = (e, project, source, cellId = null) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ project, source, cellId }));
    setDraggingProject(project);
    setDraggingSourceCell(cellId);
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Handle drop
  const handleDrop = (e, cellId, devId, weekIndex) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    const { project, source, cellId: sourceCellId } = data;

    // Se estamos movendo um projeto já alocado
    if (source === 'allocated') {
      // Encontrar localização atual do projeto
      const currentLocation = findProjectLocation(project.id);

      if (currentLocation) {
        // Verificar se o movimento é para uma posição diferente
        if (currentLocation.cellId === cellId) {
          // Estamos tentando mover para o mesmo lugar, não fazer nada
          setDraggingProject(null);
          setDraggingSourceCell(null);
          return;
        }

        // Verificar se há espaço suficiente para o projeto na nova posição
        // ignorando células ocupadas pelo próprio projeto
        let canMove = true;
        for (let i = 0; i < project.estimated_weeks; i++) {
          const checkWeekIndex = weekIndex + i;

          // Skip if beyond total weeks
          if (checkWeekIndex >= totalWeeks) {
            setNotification({
              open: true,
              message: "O projeto excede o período visível do planejamento",
              severity: "warning"
            });
            setDraggingProject(null);
            setDraggingSourceCell(null);
            return;
          }

          // Verificar se a célula está disponível OU faz parte do próprio projeto
          const isPartOfSameProject = isCellPartOfProject(devId, checkWeekIndex, project.id);
          const isAvailable = isCellAvailableForProject(devId, checkWeekIndex, project);

          if (!isAvailable && !isPartOfSameProject) {
            canMove = false;
            break;
          }
        }

        if (!canMove) {
          setNotification({
            open: true,
            message: "Não é possível alocar o projeto aqui. Já existe uma alocação neste período.",
            severity: "warning"
          });
          setDraggingProject(null);
          setDraggingSourceCell(null);
          return;
        }

        // Mover o projeto
        const newAllocations = { ...allocations };

        // Remover da posição atual
        delete newAllocations[currentLocation.cellId];

        // Adicionar na nova posição
        newAllocations[cellId] = project;

        setAllocations(newAllocations);

        // Enviar atualização para a API
        saveAllocationsToAPI(newAllocations);
      }
    } else {
      // Estamos adicionando um novo projeto do painel lateral

      // Verificar se há espaço suficiente para o projeto
      let canAllocate = true;
      for (let i = 0; i < project.estimated_weeks; i++) {
        const checkWeekIndex = weekIndex + i;

        // Skip if beyond total weeks
        if (checkWeekIndex >= totalWeeks) {
          setNotification({
            open: true,
            message: "O projeto excede o período visível do planejamento",
            severity: "warning"
          });
          setDraggingProject(null);
          setDraggingSourceCell(null);
          return;
        }

        if (!isCellAvailableForProject(devId, checkWeekIndex, project)) {
          canAllocate = false;
          break;
        }
      }

      if (!canAllocate) {
        setNotification({
          open: true,
          message: "Não é possível alocar o projeto aqui. Já existe uma alocação neste período.",
          severity: "warning"
        });
        setDraggingProject(null);
        setDraggingSourceCell(null);
        return;
      }

      // Adicionar novo projeto
      const newAllocations = { ...allocations };
      newAllocations[cellId] = project;

      // Remover dos projetos disponíveis
      const newWorkItems = workItems.filter(item => item.id !== project.id);
      setWorkItems(newWorkItems);
      setAllocations(newAllocations);

      // Enviar atualização para a API
      saveAllocationsToAPI(newAllocations);
    }

    setDraggingProject(null);
    setDraggingSourceCell(null);
  };

  // Handle drop back to available projects
  const handleDropToAvailable = (e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json'));
    const { project, source, cellId: sourceCellId } = data;

    if (source === 'allocated') {
      // Find the project in allocations
      const projectCellId = Object.keys(allocations).find(
        key => allocations[key] && allocations[key].id === project.id
      );

      if (projectCellId) {
        // Remove from allocations
        const newAllocations = { ...allocations };
        delete newAllocations[projectCellId];

        // Add back to workitems
        setWorkItems([...workItems, project]);
        setAllocations(newAllocations);

        // Enviar atualização para a API
        saveAllocationsToAPI(newAllocations);
      }
    }

    setDraggingProject(null);
    setDraggingSourceCell(null);
  };

  // Save allocations to API
  const saveAllocationsToAPI = async (newAllocations) => {
    try {
      // Converter allocations para o formato da API
      const apiAllocations = Object.entries(newAllocations).map(([cellId, workItem]) => {
        const cellInfo = parseCellId(cellId);
        return {
          developer_id: cellInfo.devId,
          work_item_id: workItem.id,
          sprint_id: "current", // Placeholder - podemos melhorar para usar a sprint correta
          week_index: cellInfo.weekIndex
        };
      });

      // Enviar para a API usando o serviço
      await developerService.updateAllocations(apiAllocations);

      setNotification({
        open: true,
        message: "Alocações salvas com sucesso",
        severity: "success"
      });
    } catch (err) {
      console.error('Erro ao salvar alocações:', err);
      setNotification({
        open: true,
        message: "Erro ao salvar alocações",
        severity: "error"
      });
    }
  };

  // Reset the board
  const resetBoard = async () => {
    try {
      setLoading(true);

      // Limpar alocações na API usando o serviço
      await developerService.clearAllocations();

      // Recarregar dados
      const workItemsRes = await workItemService.getAll();

      setWorkItems(workItemsRes.data.work_items);
      setAllocations({});
      setExpandedCells({});

      setNotification({
        open: true,
        message: "Planejamento resetado com sucesso",
        severity: "success"
      });
    } catch (err) {
      console.error('Erro ao resetar planejamento:', err);
      setNotification({
        open: true,
        message: "Erro ao resetar planejamento",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Get project data for a developer's row
  const getDevProjectsForRow = (devId) => {
    const projects = [];

    Object.entries(allocations).forEach(([cellId, project]) => {
      const cellInfo = parseCellId(cellId);
      if (cellInfo && cellInfo.devId === devId) {
        const { weekIndex } = cellInfo;
        projects.push({
          project,
          weekIndex,
          width: Math.min(project.estimated_weeks, totalWeeks - weekIndex) * 96 - 8
        });
      }
    });

    return projects;
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', p: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Carregando dados...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {/* Main Content with Planning Board and Projects Side Panel */}
      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* Main Planning Board */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h1">
              Quadro de Planejamento
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<RefreshIcon />}
              onClick={resetBoard}
            >
              Resetar
            </Button>
          </Box>

          {/* Planning board content */}
          <Paper elevation={1} sx={{ overflow: 'hidden', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', overflow: 'hidden' }}>
              {/* Developer column */}
              <Box sx={{ width: 240, flexShrink: 0, borderRight: 1, borderColor: 'divider', bgcolor: 'background.default' }}>
                {/* Developer header - Tem a mesma altura que Sprint + Semana headers combinados */}
                <Box
                  sx={{
                    height: HEADER_TOTAL_HEIGHT + 2,
                    display: 'flex',
                    alignItems: 'flex-end',
                    paddingLeft: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.default',
                    boxSizing: 'border-box'
                  }}
                >
                  <Typography variant="subtitle1" color="text.secondary" fontWeight="medium">
                    Desenvolvedores
                  </Typography>
                </Box>

                {/* Developer rows */}
                {developers.map(developer => (
                  <Box
                    key={developer.id}
                    sx={{
                      p: 2,
                      borderBottom: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      height: CELL_HEIGHT,
                      boxSizing: 'border-box',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center'
                    }}
                  >
                    <Typography variant="body1" fontWeight="medium">{developer.name}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {developer.skills.map((skill, idx) => (
                        <Chip
                          key={idx}
                          label={skill}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Sprint and Weeks grid with horizontal scroll */}
              <Box sx={{ flexGrow: 1, overflow: 'auto' }} >
                <Box sx={{ minWidth: totalWeeks * 96 }}>
                  {/* Sprint headers */}
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: 'background.default',
                      borderBottom: 1,
                      borderColor: 'divider',
                      height: HEADER_SPRINT_HEIGHT,
                    }}
                  >
                    {Array.from({ length: totalSprints }, (_, sprintIndex) => {
                      // Tenta encontrar a sprint correspondente nos dados da API
                      const sprint = sprints[sprintIndex] || { name: `Sprint ${sprintIndex + 1}` };

                      return (
                        <Box
                          key={`sprint-${sprintIndex}`}
                          sx={{
                            width: weeksPerSprint * 96,
                            borderRight: 1,
                            borderColor: 'divider',
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%'
                          }}
                        >
                          <Typography variant="subtitle1" fontWeight="medium">
                            {sprint.name}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  {/* Week headers - with time periods */}
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: 'background.default',
                      borderBottom: 1,
                      borderColor: 'divider',
                      height: HEADER_WEEK_HEIGHT
                    }}
                  >
                    {Array.from({ length: totalWeeks }, (_, weekIndex) => (
                      <Box
                        key={`week-${weekIndex}`}
                        sx={{
                          width: 96,
                          textAlign: 'center',
                          borderRight: 1,
                          borderColor: 'divider',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          height: '100%'
                        }}
                      >
                        <Typography variant="caption" fontWeight="medium" display="block">
                          Semana {weekIndex + 1}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {weekPeriods[weekIndex] || ''}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Developer rows with cells and overlaid projects */}
                  {developers.map(developer => {
                    // Get all projects for this developer
                    const devProjects = getDevProjectsForRow(developer.id);

                    return (
                      <Box
                        key={developer.id}
                        sx={{
                          display: 'flex',
                          borderBottom: 1,
                          borderColor: 'divider',
                          position: 'relative',
                          height: CELL_HEIGHT - 1
                        }}
                      >
                        {/* Background cells - just for layout and drop targets */}
                        {Array.from({ length: totalWeeks }, (_, weekIndex) => {
                          const cellId = getCellId(developer.id, weekIndex);
                          const isPartOfExpanded = Boolean(expandedCells[cellId]);
                          const canDrop = !isPartOfExpanded ||
                            (draggingProject && isPartOfExpanded &&
                              expandedCells[cellId].project.id === draggingProject.id);

                          // Identificar se a célula faz parte do projeto que está sendo arrastado
                          const isDraggingProjectCell = draggingProject &&
                            (allocations[cellId]?.id === draggingProject.id ||
                              (isPartOfExpanded && expandedCells[cellId].project.id === draggingProject.id));

                          const bgColor = canDrop && draggingProject
                            ? (isDraggingProjectCell ? 'action.selected' : 'action.hover')
                            : 'background.paper';

                          return (
                            <Box
                              key={`${developer.id}-week-${weekIndex}`}
                              sx={{
                                width: 96,
                                borderRight: 1,
                                borderColor: 'divider',
                                height: '100%'
                              }}
                            >
                              <Box
                                sx={{
                                  height: '100%',
                                  bgcolor: bgColor,
                                  cursor: canDrop ? 'pointer' : 'default'
                                }}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, cellId, developer.id, weekIndex)}
                              />
                            </Box>
                          );
                        })}

                        {/* Projects overlaid on top of the cells - these appear as continuous blocks */}
                        {devProjects.map(({ project, weekIndex, width }) => (
                          <Box
                            key={`project-${project.id}-${developer.id}`}
                            sx={{
                              position: 'absolute',
                              top: 8,
                              bottom: 8,
                              left: weekIndex * 96 + 4,
                              width: width - 17,
                              bgcolor: project.color || statusColors[project.state] || statusColors.default,
                              color: 'white',
                              borderRadius: 1,
                              p: 1,
                              overflow: 'hidden',
                              boxShadow: 2,
                              zIndex: 10,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              cursor: 'move',
                              opacity: draggingProject?.id === project.id ? 0.7 : 1,
                              '&:hover': {
                                boxShadow: 4
                              }
                            }}
                            draggable
                            onDragStart={(e) => handleDragStart(e, project, 'allocated', getCellId(developer.id, weekIndex))}
                          >
                            <Typography variant="caption" fontWeight="medium" display="block" noWrap>
                              {project.title || project.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              {project.estimated_weeks} semana(s)
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* Available Projects Panel */}
        <Box
          sx={{
            width: 320,
            bgcolor: 'background.paper',
            borderLeft: 1,
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDropToAvailable}
        >
          <Box sx={{
            p: 2,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            borderTopLeftRadius: '0.75rem'
          }}>
            <Typography variant="h6">User Stories Disponíveis</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
              Arraste para alocar
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pt: 3 }}>
            <Grid container spacing={2}>
              {workItems.map(workItem => (
                <Grid item xs={12} key={workItem.id}>
                  <Card
                    sx={{
                      cursor: 'move',
                      '&:hover': { boxShadow: 3 },
                      transition: 'box-shadow 0.2s'
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, workItem, 'available')}
                  >
                    <CardHeader
                      title={workItem.title}
                      sx={{
                        bgcolor: workItem.color || statusColors[workItem.state] || statusColors.default,
                        color: 'white',
                        py: 1.5,
                        '& .MuiCardHeader-title': {
                          fontSize: '0.95rem'
                        }
                      }}
                    />
                    <CardContent sx={{ py: 1.5, bgcolor: 'grey.50' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {workItem.estimated_weeks} semana{workItem.estimated_weeks > 1 ? 's' : ''}
                        </Typography>
                        <Chip
                          label={workItem.state}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}

              {workItems.length === 0 && (
                <Grid item xs={12}>
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body2">
                      Não há mais user stories disponíveis para alocação.
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>
      </Box>

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default SprintPlannerPage;
