const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 8000; // Hosting friendly

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Ensure folders exist ----------
const iconDir = path.join(__dirname, "../uploads/icons");
const apkDir = path.join(__dirname, "../uploads/apks");
[iconDir, apkDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ---------- Ensure JSON files exist ----------
function initJSON(file, defaultData) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
}
initJSON("apps.json", []);
initJSON("users.json", [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "dev", password: "dev123", role: "developer" }
]);

// ---------- Serve frontend ----------
app.use(express.static(path.join(__dirname, "../frontend")));

// ---------- Serve uploaded files ----------
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ---------- File upload config ----------
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === "icon") cb(null, iconDir);
        else if (file.fieldname === "apk") cb(null, apkDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ---------- JSON Helpers ----------
function readJSON(file) {
    const filePath = path.join(__dirname, file);
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
        return [];
    }
}
function writeJSON(file, data) {
    fs.writeFileSync(path.join(__dirname, file), JSON.stringify(data, null, 2), "utf8");
}

// ---------- Routes ----------

// Login
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    const users = readJSON("users.json");
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true, role: user.role, username: user.username });
    else res.json({ success: false, message: "Invalid username or password" });
});

// Upload new app (developer)
app.post("/upload-app", upload.fields([{ name: "icon" }, { name: "apk" }]), (req, res) => {
    const { appName, description, uploader } = req.body;
    if (!req.files || !req.files.icon || !req.files.apk) {
        return res.status(400).json({ success: false, message: "Icon and APK are required" });
    }
    const iconPath = "/uploads/icons/" + req.files.icon[0].filename;
    const apkPath = "/uploads/apks/" + req.files.apk[0].filename;

    let apps = readJSON("apps.json");
    apps.push({
        id: Date.now(),
        appName,
        description,
        icon: iconPath,
        apk: apkPath,
        uploader,
        approved: false
    });
    writeJSON("apps.json", apps);
    res.json({ success: true, message: "App uploaded, waiting for admin approval" });
});

// Get all approved apps
app.get("/apps", (req, res) => {
    let apps = readJSON("apps.json").filter(app => app.approved);
    res.json(apps);
});

// Admin: Get pending apps
app.get("/pending-apps", (req, res) => {
    let apps = readJSON("apps.json").filter(app => !app.approved);
    res.json(apps);
});

// Admin: Approve app
app.post("/approve-app", (req, res) => {
    const { id } = req.body;
    let apps = readJSON("apps.json");
    let appIndex = apps.findIndex(a => a.id == id);
    if (appIndex !== -1) {
        apps[appIndex].approved = true;
        writeJSON("apps.json", apps);
        res.json({ success: true });
    } else res.json({ success: false, message: "App not found" });
});

// Admin: Reject app
app.post("/reject-app", (req, res) => {
    const { id } = req.body;
    let apps = readJSON("apps.json");
    apps = apps.filter(a => a.id != id);
    writeJSON("apps.json", apps);
    res.json({ success: true });
});
// Admin: Delete app (approved or not)
app.delete("/apps/:id", (req, res) => {
    const id = parseInt(req.params.id);
    let apps = readJSON("apps.json");
    const appExists = apps.some(a => a.id === id);

    if (!appExists) {
        return res.status(404).json({ success: false, message: "App not found" });
    }

    apps = apps.filter(a => a.id !== id);
    writeJSON("apps.json", apps);
    res.json({ success: true, message: "App deleted successfully" });
});


// Fallback: Serve index.html for unknown routes
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// ---------- Start server ----------
app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
