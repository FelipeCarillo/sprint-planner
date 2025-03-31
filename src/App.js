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
  Grid
} from '@mui/material';
import {
  Refresh as RefreshIcon
} from '@mui/icons-material';

// Definir alturas específicas para garantir consistência
const HEADER_SPRINT_HEIGHT = 48; // altura do cabeçalho de sprint
const HEADER_WEEK_HEIGHT = 48; // altura do cabeçalho de semana
const HEADER_TOTAL_HEIGHT = HEADER_SPRINT_HEIGHT + HEADER_WEEK_HEIGHT; // altura total do cabeçalho
const CELL_HEIGHT = 72; // altura em pixels para todas as células

const SprintPlannerPage = () => {
  // Define number of weeks to display
  const totalWeeks = 16; // Total number of weeks to display
  const weeksPerSprint = 2; // Number of weeks per sprint

  // Calculate total sprints based on weeks
  const totalSprints = Math.ceil(totalWeeks / weeksPerSprint);

  // Generate date periods for each week (starting from today)
  const getWeekPeriods = () => {
    const periods = [];
    const today = new Date();

    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + (i * 7));

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const formatDate = (date) => {
        return `${date.getDate()}/${date.getMonth() + 1}`;
      };

      periods.push(`${formatDate(weekStart)} - ${formatDate(weekEnd)}`);
    }

    return periods;
  };

  const weekPeriods = getWeekPeriods();

  // Sample developers
  const initialDevelopers = [
    { id: 'dev-1', name: 'João Silva', skills: ['Frontend', 'React'] },
    { id: 'dev-2', name: 'Maria Oliveira', skills: ['Backend', 'Node.js'] },
    { id: 'dev-3', name: 'Carlos Souza', skills: ['UI/UX', 'Design'] },
    { id: 'dev-4', name: 'Ana Santos', skills: ['Fullstack', 'DevOps'] },
    { id: 'dev-5', name: 'Pedro Costa', skills: ['QA', 'Testing'] },
  ];

  // Sample projects with Material Design colors
  const initialProjects = [
    { id: 'proj-1', name: 'User Authentication', estimatedWeeks: 4, color: '#3f51b5' }, // Indigo
    { id: 'proj-2', name: 'Dashboard Redesign', estimatedWeeks: 3, color: '#4caf50' }, // Green
    { id: 'proj-3', name: 'API Integration', estimatedWeeks: 2, color: '#9c27b0' }, // Purple
    { id: 'proj-4', name: 'Mobile Responsive', estimatedWeeks: 1, color: '#ff9800' }, // Orange
    { id: 'proj-5', name: 'Database Migration', estimatedWeeks: 3, color: '#f44336' }, // Red
    { id: 'proj-6', name: 'Payment Gateway', estimatedWeeks: 2, color: '#009688' }, // Teal
    { id: 'proj-7', name: 'Security Audit', estimatedWeeks: 2, color: '#607d8b' }, // Blue Gray
    { id: 'proj-8', name: 'User Testing', estimatedWeeks: 1, color: '#ff5722' }, // Deep Orange
  ];

  // State for available projects and allocations
  const [availableProjects, setAvailableProjects] = useState(initialProjects);
  const [allocations, setAllocations] = useState({});

  // State for drag operation
  const [draggingProject, setDraggingProject] = useState(null);
  const [draggingSourceCell, setDraggingSourceCell] = useState(null);

  // Track which cells are part of expanded projects
  const [expandedCells, setExpandedCells] = useState({});

  useEffect(() => {
    updateExpandedCells();
  }, [allocations]);

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
  const updateExpandedCells = () => {
    const newExpandedCells = {};

    Object.entries(allocations).forEach(([cellId, project]) => {
      // Extract the developer ID and week index from the cell ID
      const cellInfo = parseCellId(cellId);
      if (cellInfo) {
        const { devId, weekIndex } = cellInfo;

        // Mark subsequent cells as expanded
        for (let i = 1; i < project.estimatedWeeks; i++) {
          const expandedCellId = getCellId(devId, weekIndex + i);
          newExpandedCells[expandedCellId] = {
            sourceId: cellId,
            project: project
          };
        }
      }
    });

    setExpandedCells(newExpandedCells);
  };

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
        for (let i = 0; i < project.estimatedWeeks; i++) {
          const checkWeekIndex = weekIndex + i;

          // Skip if beyond total weeks
          if (checkWeekIndex >= totalWeeks) {
            alert("O projeto excede o período visível do planejamento.");
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
          alert("Não é possível alocar o projeto aqui. Já existe uma alocação neste período.");
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
      }
    } else {
      // Estamos adicionando um novo projeto do painel lateral

      // Verificar se há espaço suficiente para o projeto
      let canAllocate = true;
      for (let i = 0; i < project.estimatedWeeks; i++) {
        const checkWeekIndex = weekIndex + i;

        // Skip if beyond total weeks
        if (checkWeekIndex >= totalWeeks) {
          alert("O projeto excede o período visível do planejamento.");
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
        alert("Não é possível alocar o projeto aqui. Já existe uma alocação neste período.");
        setDraggingProject(null);
        setDraggingSourceCell(null);
        return;
      }

      // Adicionar novo projeto
      const newAllocations = { ...allocations };
      newAllocations[cellId] = project;

      // Remover dos projetos disponíveis
      setAvailableProjects(prev => prev.filter(p => p.id !== project.id));
      setAllocations(newAllocations);
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
        setAllocations(newAllocations);

        // Add back to available projects
        setAvailableProjects(prev => [...prev, project]);
      }
    }

    setDraggingProject(null);
    setDraggingSourceCell(null);
  };

  // Reset the board
  const resetBoard = () => {
    setAllocations({});
    setExpandedCells({});
    setAvailableProjects(initialProjects);
    setDraggingProject(null);
    setDraggingSourceCell(null);
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
          width: Math.min(project.estimatedWeeks, totalWeeks - weekIndex) * 96 - 8
        });
      }
    });

    return projects;
  };

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
                {initialDevelopers.map(developer => (
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
                      height: HEADER_SPRINT_HEIGHT, // Altura fixa para o cabeçalho de sprint
                    }}
                  >
                    {Array.from({ length: totalSprints }, (_, sprintIndex) => (
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
                          Sprint {sprintIndex + 1}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Week headers - with time periods */}
                  <Box
                    sx={{
                      display: 'flex',
                      bgcolor: 'background.default',
                      borderBottom: 1,
                      borderColor: 'divider',
                      height: HEADER_WEEK_HEIGHT // Altura fixa para o cabeçalho de semana
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
                          {weekPeriods[weekIndex]}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Developer rows with cells and overlaid projects */}
                  {initialDevelopers.map(developer => {
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
                              bgcolor: project.color,
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
                              {project.name}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.9 }}>
                              {project.estimatedWeeks} semana(s)
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
            <Typography variant="h6">Projetos Disponíveis</Typography>
            <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
              Arraste para alocar
            </Typography>
          </Box>

          <Divider />

          <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, pt: 3 }}>
            <Grid container spacing={2}>
              {availableProjects.map(project => (
                <Grid item xs={12} key={project.id}>
                  <Card
                    sx={{
                      cursor: 'move',
                      '&:hover': { boxShadow: 3 },
                      transition: 'box-shadow 0.2s'
                    }}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project, 'available')}
                  >
                    <CardHeader
                      title={project.name}
                      sx={{
                        bgcolor: project.color,
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
                          {project.estimatedWeeks} semana{project.estimatedWeeks > 1 ? 's' : ''}
                        </Typography>
                        <Chip
                          label={project.estimatedWeeks > 2 ? 'Alta' : 'Média'}
                          size="small"
                          color={project.estimatedWeeks > 2 ? 'error' : 'info'}
                          variant="outlined"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default SprintPlannerPage;