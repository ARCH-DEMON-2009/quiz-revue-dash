# cPanel Deployment Guide

This guide explains how to deploy your Lovable app to cPanel hosting without running any commands.

---

## Step 1: Download Your Built App from Lovable

1. In Lovable, click the **Share** button (top-right corner)
2. Click **Export** to download your project as a ZIP file
3. The downloaded file contains your ready-to-deploy built application

---

## Step 2: Extract the ZIP File

1. Extract/unzip the downloaded file on your computer
2. You'll see a folder with your built app files including:
   - `index.html`
   - `assets/` folder (CSS, JS, images)
   - `.htaccess` (for routing)
   - Other static files

---

## Step 3: Login to cPanel

1. Go to your hosting provider's cPanel login page
2. Enter your username and password
3. You'll be redirected to the cPanel dashboard

---

## Step 4: Open File Manager

1. In cPanel dashboard, find and click **File Manager**
2. Navigate to `public_html` folder (this is your website's root directory)
3. If deploying to a subdomain, navigate to the appropriate folder

---

## Step 5: Upload Files

### Option A: Upload ZIP and Extract (Recommended)

1. In File Manager, click **Upload** button
2. Upload the entire ZIP file
3. After upload, right-click the ZIP file
4. Select **Extract**
5. Make sure files are extracted directly into `public_html` (not in a subfolder)
6. Delete the ZIP file after extraction

### Option B: Upload Files Individually

1. Click **Upload** button
2. Drag and drop all files and folders from your extracted ZIP
3. Wait for all uploads to complete

---

## Step 6: Verify File Structure

Your `public_html` folder should look like this:

```
public_html/
├── index.html
├── .htaccess
├── assets/
│   ├── index-xxxxx.js
│   ├── index-xxxxx.css
│   └── (other assets)
├── favicon.ico
├── logo.png
└── robots.txt
```

**Important:** The `index.html` file MUST be directly inside `public_html`, NOT inside a subfolder.

---

## Step 7: Check .htaccess File

1. Make sure `.htaccess` file is uploaded (it may be hidden)
2. In File Manager, click **Settings** (top-right)
3. Check **Show Hidden Files** and click Save
4. Verify `.htaccess` exists in `public_html`

If `.htaccess` is missing, create it with this content:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

Options -Indexes
AddDefaultCharset UTF-8
ErrorDocument 404 /index.html
```

---

## Step 8: Test Your Website

1. Open your browser
2. Go to your domain (e.g., `https://yourdomain.com`)
3. Test navigation to different pages
4. Verify all routes work correctly

---

## Troubleshooting

### Blank Page
- Check browser console (F12) for errors
- Verify all files uploaded correctly
- Check if `assets/` folder has all JS and CSS files

### 404 Errors on Page Refresh
- Verify `.htaccess` file exists and has correct content
- Check if `mod_rewrite` is enabled on your hosting
- Contact your hosting provider to enable Apache mod_rewrite

### Images Not Loading
- Check file paths are correct
- Verify images are in the correct location
- Check file permissions (should be 644 for files, 755 for folders)

### CSS/JS Not Loading
- Clear browser cache (Ctrl+Shift+R)
- Check `assets/` folder is uploaded completely
- Verify file permissions

---

## File Permissions

If you encounter permission issues, set:
- **Folders:** 755
- **Files:** 644

In File Manager:
1. Select files/folders
2. Right-click → **Change Permissions**
3. Set appropriate values

---

## SSL Certificate (HTTPS)

For HTTPS:
1. In cPanel, find **SSL/TLS** or **Let's Encrypt**
2. Install a free SSL certificate
3. Enable **Force HTTPS** redirect

---

## Need Help?

Contact us via WhatsApp: +84 522122461

---

**Last Updated:** January 2025
