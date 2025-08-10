require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload folders
const iconDir = path.join(__dirname, "../uploads/icons");
const apkDir = path.join(__dirname, "../uploads/apks");

const fs = require("fs");
[iconDir, apkDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Multer config
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

// ---------- ROUTES ----------

// Login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .single();

    if (error || !users) {
        return res.json({ success: false, message: "Invalid username or password" });
    }

    res.json({ success: true, role: users.role, username: users.username });
});

// Upload new app
app.post("/upload-app", upload.fields([{ name: "icon" }, { name: "apk" }]), async (req, res) => {
    const { appName, description, uploader } = req.body;
    if (!req.files || !req.files.icon || !req.files.apk) {
        return res.status(400).json({ success: false, message: "Icon and APK are required" });
    }

    const iconPath = "/uploads/icons/" + req.files.icon[0].filename;
    const apkPath = "/uploads/apks/" + req.files.apk[0].filename;

    const { error } = await supabase.from("apps").insert([
        {
            app_name: appName,
            description: description,
            icon: iconPath,
            apk: apkPath,
            uploader: uploader,
            approved: false
        }
    ]);

    if (error) return res.json({ success: false, message: error.message });

    res.json({ success: true, message: "App uploaded, waiting for admin approval" });
});

// Get approved apps
app.get("/apps", async (req, res) => {
    const { data, error } = await supabase
        .from("apps")
        .select("*")
        .eq("approved", true);

    if (error) return res.json([]);

    res.json(data);
});

// Pending apps (admin)
app.get("/pending-apps", async (req, res) => {
    const { data, error } = await supabase
        .from("apps")
        .select("*")
        .eq("approved", false);

    if (error) return res.json([]);

    res.json(data);
});

// Approve app
app.post("/approve-app", async (req, res) => {
    const { id } = req.body;
    const { error } = await supabase
        .from("apps")
        .update({ approved: true })
        .eq("id", id);

    if (error) return res.json({ success: false, message: error.message });

    res.json({ success: true });
});

// Reject app
app.post("/reject-app", async (req, res) => {
    const { id } = req.body;
    const { error } = await supabase
        .from("apps")
        .delete()
        .eq("id", id);

    if (error) return res.json({ success: false, message: error.message });

    res.json({ success: true });
});

// Delete app
app.delete("/apps/:id", async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from("apps")
        .delete()
        .eq("id", id);

    if (error) return res.json({ success: false, message: error.message });

    res.json({ success: true, message: "App deleted successfully" });
});

// Profile info
app.get("/profile/:username", async (req, res) => {
    const { username } = req.params;
    const { data, error } = await supabase
        .from("users")
        .select("username, role")
        .eq("username", username)
        .single();

    if (error) return res.json({ success: false });

    res.json({ success: true, profile: data });
});

// Settings (placeholder for now)
app.get("/settings/:username", async (req, res) => {
    res.json({
        success: true,
        settings: {
            theme: "light",
            notifications: true
        }
    });
});

// Fallback
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
