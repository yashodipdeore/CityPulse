import React, { useState, useEffect } from "react";
import {
  Box,
  Grid,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Alert,
  AlertTitle,
} from "@mui/material";
import {
  BarChart as BarChartIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import "leaflet/dist/leaflet.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const officialsDashboard = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState({
    totalProjects: 0,
    ongoingProjects: 0,
    totalReports: 0,
    unresolvedReports: 0,
  });
  const [bottlenecks, setBottlenecks] = useState([]);

  // Set initial viewport to center on your city
  const centerPosition = [37.7749, -122.4194];

  // Load data from Firestore
  useEffect(() => {
    // Real-time listener for projects
    const projectsUnsubscribe = onSnapshot(
      collection(db, "projects"),
      (snapshot) => {
        const projectsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectsData);

        // Calculate stats
        setStats((prev) => ({
          ...prev,
          totalProjects: projectsData.length,
          ongoingProjects: projectsData.filter((p) => p.status === "ongoing")
            .length,
        }));

        // Identify bottlenecks (simple demo logic)
        const newBottlenecks = projectsData
          .filter((p) => p.status === "ongoing")
          .map((p) => ({
            id: p.id,
            name: p.name,
            type: "project",
            reason: "Extended timeline",
          }));

        setBottlenecks(newBottlenecks);
      },
      (error) => {
        console.error("Error fetching projects:", error);
      }
    );

    // Real-time listener for reports
    const reportsUnsubscribe = onSnapshot(
      collection(db, "reports"),
      (snapshot) => {
        const reportsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(reportsData);

        // Calculate stats
        setStats((prev) => ({
          ...prev,
          totalReports: reportsData.length,
          unresolvedReports: reportsData.filter(
            (r) => r.status === "reported" || r.status === "confirmed"
          ).length,
        }));
      },
      (error) => {
        console.error("Error fetching reports:", error);
      }
    );

    return () => {
      projectsUnsubscribe();
      reportsUnsubscribe();
    };
  }, []);

  // Prepare chart data
  const reportsByTypeData = {
    labels: ["Congestion", "Hazard", "Outage", "Sewage"],
    datasets: [
      {
        label: "Reports by Type",
        data: [
          reports.filter((r) => r.type === "congestion").length,
          reports.filter((r) => r.type === "hazard").length,
          reports.filter((r) => r.type === "outage").length,
          reports.filter((r) => r.type === "sewage").length,
        ],
        backgroundColor: [
          "rgba(255, 99, 132, 0.7)",
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
        ],
        borderColor: [
          "rgba(255, 99, 132, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const projectsByStatusData = {
    labels: ["Planned", "Ongoing", "Completed"],
    datasets: [
      {
        label: "Projects by Status",
        data: [
          projects.filter((p) => p.status === "planned").length,
          projects.filter((p) => p.status === "ongoing").length,
          projects.filter((p) => p.status === "completed").length,
        ],
        backgroundColor: [
          "rgba(54, 162, 235, 0.7)",
          "rgba(255, 206, 86, 0.7)",
          "rgba(75, 192, 192, 0.7)",
        ],
        borderColor: [
          "rgba(54, 162, 235, 1)",
          "rgba(255, 206, 86, 1)",
          "rgba(75, 192, 192, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Function to get appropriate icon based on type
  const createCustomIcon = (type, status) => {
    const color =
      status === "completed"
        ? "green"
        : status === "ongoing"
        ? "orange"
        : status === "planned"
        ? "blue"
        : "red";

    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
      ">
        ${type.charAt(0).toUpperCase()}
      </div>
    `;

    return new Icon({
      html: iconHtml,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
    });
  };

  // Filter data based on active filter
  const filteredProjects =
    activeFilter === "all"
      ? projects
      : projects.filter((p) => p.status === activeFilter);

  const filteredReports =
    activeFilter === "all"
      ? reports
      : reports.filter((r) => r.status === activeFilter);

  // Component to set initial view
  const SetViewOnLoad = () => {
    const map = useMap();
    map.setView(centerPosition, 11);
    return null;
  };

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <Box
        sx={{
          width: 400,
          bgcolor: "grey.50",
          p: 3,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h4" gutterBottom>
          CityPulse Dashboard
        </Typography>

        {/* Stats Overview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <BarChartIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Overview</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: "info.light", p: 2, borderRadius: 1 }}>
                  <Typography variant="h4" color="info.dark">
                    {stats.totalProjects}
                  </Typography>
                  <Typography variant="body2">Total Projects</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: "warning.light", p: 2, borderRadius: 1 }}>
                  <Typography variant="h4" color="warning.dark">
                    {stats.ongoingProjects}
                  </Typography>
                  <Typography variant="body2">Ongoing</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: "error.light", p: 2, borderRadius: 1 }}>
                  <Typography variant="h4" color="error.dark">
                    {stats.totalReports}
                  </Typography>
                  <Typography variant="body2">Total Reports</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ bgcolor: "secondary.light", p: 2, borderRadius: 1 }}>
                  <Typography variant="h4" color="secondary.dark">
                    {stats.unresolvedReports}
                  </Typography>
                  <Typography variant="body2">Unresolved</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Charts */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <TrendingUpIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Analytics</Typography>
            </Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Reports by Type
              </Typography>
              <Doughnut
                data={reportsByTypeData}
                options={{ maintainAspectRatio: true }}
              />
            </Box>
            <Box>
              <Typography variant="body2" fontWeight="medium" gutterBottom>
                Projects by Status
              </Typography>
              <Bar
                data={projectsByStatusData}
                options={{ maintainAspectRatio: true }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Bottleneck Alerts */}
        {bottlenecks.length > 0 && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Bottleneck Alerts</Typography>
              </Box>
              {bottlenecks.map((bottleneck) => (
                <Alert key={bottleneck.id} severity="warning" sx={{ mb: 1 }}>
                  <AlertTitle>{bottleneck.name}</AlertTitle>
                  {bottleneck.reason}
                </Alert>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <FilterIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Filters</Typography>
            </Box>
            <FormControl fullWidth>
              <InputLabel>Filter by</InputLabel>
              <Select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                label="Filter by"
              >
                <MenuItem value="all">All Items</MenuItem>
                <MenuItem value="planned">Planned Projects</MenuItem>
                <MenuItem value="ongoing">Ongoing Projects</MenuItem>
                <MenuItem value="completed">Completed Projects</MenuItem>
                <MenuItem value="reported">Reported Issues</MenuItem>
                <MenuItem value="confirmed">Confirmed Issues</MenuItem>
                <MenuItem value="resolved">Resolved Issues</MenuItem>
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        {/* Projects List */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Projects ({filteredProjects.length})
          </Typography>
          {filteredProjects.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              fontStyle="italic"
            >
              No projects found
            </Typography>
          ) : (
            filteredProjects.map((project) => (
              <Card
                key={project.id}
                sx={{
                  mb: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => setSelectedLocation(project)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1" fontWeight="medium">
                      {project.name}
                    </Typography>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        bgcolor:
                          project.status === "ongoing"
                            ? "warning.light"
                            : project.status === "completed"
                            ? "success.light"
                            : "info.light",
                        color:
                          project.status === "ongoing"
                            ? "warning.dark"
                            : project.status === "completed"
                            ? "success.dark"
                            : "info.dark",
                      }}
                    >
                      {project.status}
                    </Box>
                  </Box>
                  <Typography variant="body2">{project.description}</Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Box>

        {/* Reports List */}
        <Box>
          <Typography variant="h6" gutterBottom>
            Reports ({filteredReports.length})
          </Typography>
          {filteredReports.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              fontStyle="italic"
            >
              No reports found
            </Typography>
          ) : (
            filteredReports.map((report) => (
              <Card
                key={report.id}
                sx={{
                  mb: 1,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => setSelectedLocation(report)}
              >
                <CardContent sx={{ py: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1" fontWeight="medium">
                      Report #{report.id.slice(0, 6)}
                    </Typography>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: "0.75rem",
                        bgcolor:
                          report.status === "reported"
                            ? "warning.light"
                            : report.status === "resolved"
                            ? "success.light"
                            : "error.light",
                        color:
                          report.status === "reported"
                            ? "warning.dark"
                            : report.status === "resolved"
                            ? "success.dark"
                            : "error.dark",
                      }}
                    >
                      {report.status}
                    </Box>
                  </Box>
                  <Typography variant="body2" gutterBottom>
                    {report.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {report.timestamp?.toDate().toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>

      {/* Map */}
      <Box sx={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={centerPosition}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
        >
          <SetViewOnLoad />

          {/* OpenStreetMap Tile Layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render project markers */}
          {filteredProjects.map((project) => (
            <Marker
              key={`project-${project.id}`}
              position={
                project.position || [project.latitude, project.longitude]
              }
              icon={createCustomIcon(project.type, project.status)}
              eventHandlers={{
                click: () => setSelectedLocation(project),
              }}
            />
          ))}

          {/* Render report markers */}
          {filteredReports.map((report) => (
            <Marker
              key={`report-${report.id}`}
              position={report.position || [report.latitude, report.longitude]}
              icon={createCustomIcon(report.type, report.status)}
              eventHandlers={{
                click: () => setSelectedLocation(report),
              }}
            />
          ))}

          {/* Popup for selected location */}
          {selectedLocation && (
            <Popup
              position={
                selectedLocation.position || [
                  selectedLocation.latitude,
                  selectedLocation.longitude,
                ]
              }
              onClose={() => setSelectedLocation(null)}
            >
              <Box sx={{ p: 1, minWidth: "200px" }}>
                <Typography variant="h6" gutterBottom>
                  {selectedLocation.name ||
                    `Report #${selectedLocation.id.slice(0, 6)}`}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  {selectedLocation.description}
                </Typography>
                <Typography variant="body2" gutterBottom>
                  Type: {selectedLocation.type}
                </Typography>
                {selectedLocation.status && (
                  <Typography variant="body2" gutterBottom>
                    Status:{" "}
                    <span
                      style={{
                        color:
                          selectedLocation.status === "completed"
                            ? "green"
                            : selectedLocation.status === "ongoing"
                            ? "orange"
                            : selectedLocation.status === "resolved"
                            ? "green"
                            : selectedLocation.status === "confirmed"
                            ? "orange"
                            : "blue",
                      }}
                    >
                      {selectedLocation.status}
                    </span>
                  </Typography>
                )}
                {selectedLocation.timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedLocation.timestamp.toDate().toLocaleString()}
                  </Typography>
                )}
              </Box>
            </Popup>
          )}
        </MapContainer>
      </Box>
    </Box>
  );
};

export default officialsDashboard;
