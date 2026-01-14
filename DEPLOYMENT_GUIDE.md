# Test Sagar - cPanel Deployment Guide

## Quick Deploy (No Build Required!)

### Step 1: Export from Lovable
1. Open your project in Lovable
2. Click the **"Share"** button (top right corner)
3. Click **"Export"** to download the built ZIP file
4. The ZIP contains the production-ready build with all files

### Step 2: Upload to cPanel
1. Login to your cPanel dashboard
2. Open **File Manager**
3. Navigate to `public_html` folder
4. Delete existing files (backup first if needed)
5. Click **Upload** and select the ZIP file
6. Right-click the ZIP file → **Extract**
7. Move all extracted files to `public_html` root (not inside a subfolder!)

### Step 3: Verify Structure
Your `public_html` should look like:
```
public_html/
├── index.html
├── .htaccess
├── assets/
│   ├── index-xxxxx.js
│   └── index-xxxxx.css
├── logo.png
└── ...
```

**Important:** The `index.html` and `.htaccess` must be directly in `public_html`, not in a subfolder!

### Troubleshooting White Screen

1. **Check .htaccess exists** - It handles SPA routing
2. **Check file permissions** - Files should be 644, folders 755
3. **Check mod_rewrite is enabled** - Contact hosting if needed
4. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)

## Maintenance Mode

Admins can toggle maintenance mode from the Admin Panel:
1. Login as admin
2. Go to `/admin`
3. Toggle the "Maintenance" switch in the top nav
4. Non-admin users will see a maintenance page
5. Admins can still access all features

## Features Included

- ✅ SPA routing via .htaccess
- ✅ GZIP compression
- ✅ Browser caching for assets
- ✅ Security headers
- ✅ Custom 404 page
- ✅ Maintenance mode (admin toggle)
