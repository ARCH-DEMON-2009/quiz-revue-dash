# Test Sagar - cPanel Deployment Guide

## Quick Deploy (No Build Required!)

### Step 1: Export production build
1. Build or export your project from your design/build tool or CI pipeline
2. Ensure you have the production-ready ZIP or build artifacts available for upload

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

### Step 4: Check Hidden Files (.htaccess)

If you don't see `.htaccess`:
1. In File Manager, click **Settings** (top-right gear icon)
2. Check **"Show Hidden Files (dotfiles)"**
3. Click **Save**
4. Refresh - you should now see `.htaccess`

### Step 5: Create .htaccess if Missing

If `.htaccess` is not in the exported ZIP, create a new file named `.htaccess` in `public_html` with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle SPA routing
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Prevent directory listing
Options -Indexes

# Set default charset
AddDefaultCharset UTF-8

# Enable GZIP compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Handle 404 for SPA
ErrorDocument 404 /index.html
```

### Troubleshooting White Screen

1. **Check .htaccess exists** - It handles SPA routing (must be in root!)
2. **Check file permissions** - Files should be 644, folders 755
3. **Check mod_rewrite is enabled** - Contact hosting if needed
4. **Clear browser cache** - Hard refresh (Ctrl+Shift+R)
5. **Check browser console** - Press F12 to see JavaScript errors

## Maintenance Mode

Admins can toggle maintenance mode from the Admin Panel:
1. Login as admin
2. Go to `/admin`
3. Toggle the "Maintenance" switch in the top nav
4. Non-admin users will see the maintenance page
5. Admins can still access all site features

**Note:** The maintenance mode check now works for all users (including non-logged-in visitors).

## Features Included

- ✅ SPA routing via .htaccess
- ✅ GZIP compression
- ✅ Browser caching for assets
- ✅ Security headers
- ✅ Custom 404 page
- ✅ Maintenance mode (admin toggle) - blocks all non-admin users
