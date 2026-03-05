# How to Deploy Your Website (Buddika Stores)

Here are the simplest ways to publish your website to the internet so anyone can visit it.

## Option 1: The Easiest Way (Drag & Drop) - Recommended for Testing
You can put your site online in less than 2 minutes using **Netlify Drop**.

1.  **Prepare your folder**: Make sure your project folder (`drone tharindu`) has the `index.html` file directly inside it (which it does).
2.  **Go to Netlify Drop**: Open your web browser and go to [https://app.netlify.com/drop](https://app.netlify.com/drop).
3.  **Drag and Drop**: Drag your entire `drone tharindu` folder onto the page where it says "Drag and drop your site folder here".
4.  **Wait a moment**: Netlify will upload your files and give you a link (e.g., `random-name-123.netlify.app`).
5.  **Rename (Optional)**: If you sign up for a free Netlify account, you can change the site name to something like `buddikastores.netlify.app`.

## Option 2: The Professional Way (GitHub + Vercel/Netlify)
This is best if you want to update the site frequently.

1.  **Create a GitHub Account**: Go to [github.com](https://github.com) and sign up.
2.  **Install Git**: Download and install Git on your computer if you haven't.
3.  **Push your code**:
    *   Open your terminal in the project folder.
    *   Run: `git init`
    *   Run: `git add .`
    *   Run: `git commit -m "Initial commit"`
    *   Create a new repository on GitHub and follow the instructions to push your code.
4.  **Connect to Vercel**:
    *   Go to [vercel.com](https://vercel.com) and sign up (login with GitHub).
    *   Click "Add New Project" and select your `drone tharindu` repository.
    *   Click "Deploy".
    *   Your site will be online automatically, and every time you save changes to GitHub, the live site updates!

## Option 3: Using a Web Host (cPanel)
If you already bought hosting (like from a Sri Lankan provider or GoDaddy):

1.  Log in to your **cPanel**.
2.  Go to **File Manager**.
3.  Open the `public_html` folder.
4.  Upload all your files (`index.html`, `assets` folder, etc.) directly there.
5.  Your site will be visible at your domain (e.g., `www.buddikastores.com`).

---

### Pre-Deployment Checklist
- [x] **Home Page**: Checked `index.html`.
- [x] **Images**: Ensure all images are in the `assets` folder.
- [x] **Links**: Check if all links work.

Good luck launching Buddika Stores!
