<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/16qGTTp2bgOvPSfg_vKptaD1dLxnX-FPF

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

To deploy this project to Vercel:

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the project in Vercel.
3.  Vercel will automatically detect Vite and configure the build settings.
4.  **Important:** Add the following Environment Variables in the Vercel project settings:
    *   `GEMINI_API_KEY`: Your Gemini API Key.
    *   `VITE_GEMINI_API_KEY`: Same as above (if used by Vite directly).
5.  Deploy!

The `vercel.json` file is already configured to handle client-side routing.
