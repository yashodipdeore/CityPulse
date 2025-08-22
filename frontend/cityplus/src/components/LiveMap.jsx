import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Modal,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography,
} from "@mui/material";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { Icon } from "leaflet";
import { AddCircle as AddCircleIcon } from "@mui/icons-material";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "leaflet/dist/leaflet.css";

// Fix for default markers in react-leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = new Icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const LiveMap = ({ alerts, setAlerts }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    type: "congestion",
    description: "",
    image: null,
  });

  // Set initial viewport to center on your city (example: San Francisco)
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
      },
      (error) => {
        console.error("Error fetching reports:", error);
      }
    );

    // Real-time listener for alerts
    const alertsUnsubscribe = onSnapshot(
      collection(db, "alerts"),
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newAlert = {
              id: change.doc.id,
              ...change.doc.data(),
            };
            setAlerts((prev) => [...prev, newAlert]);

            // Show browser notification if available
            if (
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(`CityPulse Alert: ${newAlert.title}`, {
                body: newAlert.message,
                icon: "/icon-192.png",
              });
            }
          }
        });
      },
      (error) => {
        console.error("Error fetching alerts:", error);
      }
    );

    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }

    return () => {
      projectsUnsubscribe();
      reportsUnsubscribe();
      alertsUnsubscribe();
    };
  }, [setAlerts]);

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

  // Handle report submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get current map center as report location
      const mapCenter = window.map.getCenter();
      const position = [mapCenter.lat, mapCenter.lng];

      // Create report object
      const newReport = {
        type: reportForm.type,
        description: reportForm.description,
        position: position,
        status: "reported",
        timestamp: new Date(),
      };

      // Add to Firestore
      await addDoc(collection(db, "reports"), newReport);

      // Reset form and close modal
      setReportForm({ type: "congestion", description: "", image: null });
      setOpen(false);

      // Show success alert
      setAlerts((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: "Report Submitted",
          message: "Your issue has been reported successfully!",
          type: "success",
        },
      ]);
    } catch (error) {
      console.error("Error submitting report:", error);

      // Show error alert
      setAlerts((prev) => [
        ...prev,
        {
          id: Date.now(),
          title: "Submission Error",
          message:
            "There was an error submitting your report. Please try again.",
          type: "error",
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Component to set initial view
  const SetViewOnLoad = () => {
    const map = useMap();
    map.setView(centerPosition, 11);
    return null;
  };

  return (
    <Box sx={{ position: "relative", width: "100%", height: "100vh" }}>
      <MapContainer
        center={centerPosition}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        zoomControl={true}
        ref={(map) => {
          if (map) window.map = map;
        }}
      >
        <SetViewOnLoad />

        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render project markers */}
        {projects.map((project) => (
          <Marker
            key={`project-${project.id}`}
            position={project.position || [project.latitude, project.longitude]}
            icon={createCustomIcon(project.type, project.status)}
            eventHandlers={{
              click: () => setSelectedLocation(project),
            }}
          />
        ))}

        {/* Render report markers */}
        {reports.map((report) => (
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
                {selectedLocation.name || `Report #${selectedLocation.id}`}
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

      {/* Report Issue Button */}
      <Button
        onClick={handleOpen}
        variant="contained"
        startIcon={<AddCircleIcon />}
        sx={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 1000,
        }}
      >
        Report Issue
      </Button>

      {/* Map legend */}
      <Box
        sx={{
          position: "absolute",
          bottom: 20,
          right: 10,
          bgcolor: "background.paper",
          p: 2,
          borderRadius: 1,
          boxShadow: 3,
          zIndex: 1000,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Legend
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              bgcolor: "orange",
              mr: 1,
            }}
          />
          <Typography variant="body2">Ongoing Projects</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              bgcolor: "blue",
              mr: 1,
            }}
          />
          <Typography variant="body2">Planned Projects</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box
            sx={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              bgcolor: "red",
              mr: 1,
            }}
          />
          <Typography variant="body2">Issues & Reports</Typography>
        </Box>
      </Box>

      {/* Report Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="report-modal-title"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 1,
          }}
        >
          <Typography
            id="report-modal-title"
            variant="h6"
            component="h2"
            gutterBottom
          >
            Report an Issue
          </Typography>

          <Box component="form" onSubmit={handleReportSubmit} sx={{ mt: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Issue Type</InputLabel>
              <Select
                value={reportForm.type}
                label="Issue Type"
                onChange={(e) =>
                  setReportForm({ ...reportForm, type: e.target.value })
                }
              >
                <MenuItem value="congestion">Traffic Congestion</MenuItem>
                <MenuItem value="hazard">Road Hazard</MenuItem>
                <MenuItem value="outage">Power Outage</MenuItem>
                <MenuItem value="sewage">Sewage Issue</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              required
              value={reportForm.description}
              onChange={(e) =>
                setReportForm({ ...reportForm, description: e.target.value })
              }
              placeholder="Please describe the issue in detail..."
              margin="normal"
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 2 }}
            >
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default LiveMap;
