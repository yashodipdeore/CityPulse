import React, { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Modal,
  TextField,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Map as MapIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";
import LiveMap from "./components/LiveMap";
import OfficialsDashboard from "./components/officialsDashboard";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 1,
};

function App() {
  const [currentView, setCurrentView] = useState("citizen");
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Hardcoded admin emails (for demo purposes)
  const adminEmails = ["admin@citypulse.com", "official@citypulse.com"];

  // Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && adminEmails.includes(user.email)) {
        setUser(user);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        loginForm.email,
        loginForm.password
      );

      if (adminEmails.includes(userCredential.user.email)) {
        setUser(userCredential.user);
        handleClose();
        setCurrentView("officials");
      } else {
        setLoginError("Access restricted to authorized officials only");
        await signOut(auth);
      }
    } catch (error) {
      setLoginError("Invalid email or password");
      console.error("Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView("citizen");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "grey.50" }}>
      <AppBar position="static" sx={{ bgcolor: "primary.main" }}>
        <Toolbar>
          <MapIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Box component="span" sx={{ color: "lightblue" }}>
              City
            </Box>
            Pulse
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            {user ? (
              <>
                <Button
                  color="inherit"
                  startIcon={<HomeIcon />}
                  onClick={() => setCurrentView("citizen")}
                  variant={currentView === "citizen" ? "outlined" : "text"}
                >
                  Citizen View
                </Button>
                <Button
                  color="inherit"
                  startIcon={<PeopleIcon />}
                  onClick={() => setCurrentView("officials")}
                  variant={currentView === "officials" ? "outlined" : "text"}
                >
                  Officials Dashboard
                </Button>
                <Button
                  color="inherit"
                  startIcon={<LogoutIcon />}
                  onClick={handleLogout}
                  variant="outlined"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  startIcon={<HomeIcon />}
                  onClick={() => setCurrentView("citizen")}
                  variant={currentView === "citizen" ? "outlined" : "text"}
                >
                  Citizen View
                </Button>
                <Button
                  color="inherit"
                  startIcon={<LoginIcon />}
                  onClick={handleOpen}
                  variant="outlined"
                >
                  Official Login
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Alert notifications */}
      {alerts.length > 0 && (
        <Box
          sx={{
            position: "fixed",
            top: 80,
            right: 20,
            zIndex: 2000,
            maxWidth: 400,
          }}
        >
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              severity="warning"
              sx={{ mb: 2 }}
              action={
                <IconButton
                  aria-label="close"
                  color="inherit"
                  size="small"
                  onClick={() =>
                    setAlerts(alerts.filter((a) => a.id !== alert.id))
                  }
                >
                  <CloseIcon fontSize="inherit" />
                </IconButton>
              }
            >
              <AlertTitle>{alert.title}</AlertTitle>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}

      {currentView === "citizen" ? (
        <LiveMap alerts={alerts} setAlerts={setAlerts} />
      ) : user ? (
        <OfficialsDashboard />
      ) : (
        <Box sx={{ p: 10, textAlign: "center" }}>
          <Typography variant="h4" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body1" gutterBottom sx={{ mb: 4 }}>
            Please log in to access the officials dashboard
          </Typography>
          <Button
            variant="contained"
            startIcon={<LoginIcon />}
            onClick={handleOpen}
            size="large"
          >
            Official Login
          </Button>
        </Box>
      )}

      {/* Login Modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="login-modal-title"
      >
        <Box sx={style}>
          <Typography
            id="login-modal-title"
            variant="h6"
            component="h2"
            gutterBottom
          >
            Official Login
          </Typography>

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Email"
              type="email"
              value={loginForm.email}
              onChange={(e) =>
                setLoginForm({ ...loginForm, email: e.target.value })
              }
              placeholder="official@citypulse.com"
              margin="normal"
            />

            <TextField
              fullWidth
              required
              label="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                setLoginForm({ ...loginForm, password: e.target.value })
              }
              placeholder="Enter your password"
              margin="normal"
            />

            {loginError && (
              <Alert severity="error" sx={{ my: 2 }}>
                {loginError}
              </Alert>
            )}

            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
              Login
            </Button>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 2, textAlign: "center" }}
            >
              Demo credentials: admin@citypulse.com / password123
            </Typography>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}

export default App;
