# Deployment Guide

This guide explains how to deploy your trading platform with the frontend on Vercel and backend on Render.

## Architecture

- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js matching engine deployed on Render
- **Database**: Firebase (already configured)

## Local Development

The app automatically uses `localhost:4000` for development. No configuration needed.

## Production Deployment

### 1. Deploy Backend to Render

1. Create a new Web Service on [Render.com](https://render.com)
2. Connect your GitHub repository
3. Configure the service:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Environment**: `Node`

4. Set environment variables in Render:
   ```
   NODE_ENV=production
   PORT=4000
   ```

5. Note your Render app URL (e.g., `https://your-app-name.onrender.com`)

### 2. Deploy Frontend to Vercel

1. Create a new project on [Vercel](https://vercel.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Framework Preset**: Create React App
   - **Root Directory**: leave empty (uses root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Set environment variables in Vercel dashboard:
   ```
   REACT_APP_API_URL=https://your-app-name.onrender.com
   REACT_APP_WS_URL=wss://your-app-name.onrender.com
   ```

### 3. Update API Configuration

The app will automatically detect the environment and use:
- **Development**: `localhost:4000` 
- **Production**: Environment variables from Vercel

### 4. Test the Deployment

1. **Test API Connection**: Visit `https://your-vercel-app.vercel.app`
2. **Check Browser Console**: Look for API config logs
3. **Test Order Placement**: Place a test order to verify the connection
4. **Monitor Logs**: Check both Vercel and Render logs for errors

## Environment Variables Reference

### Frontend (Vercel)
```bash
REACT_APP_API_URL=https://your-render-app.onrender.com
REACT_APP_WS_URL=wss://your-render-app.onrender.com
```

### Backend (Render)
```bash
NODE_ENV=production
PORT=4000
# Add any other backend environment variables as needed
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your backend allows requests from your Vercel domain
2. **WebSocket Connection Failed**: Verify WSS (not WS) is used for production
3. **API Not Found**: Check that environment variables are set correctly in Vercel
4. **Render App Sleeping**: Free Render apps sleep after inactivity - consider upgrading for production

### Debug Steps

1. Check environment variables in Vercel dashboard
2. Verify the API URL in browser network tab
3. Test the backend API directly: `https://your-render-app.onrender.com/api/depth?market_id=4`
4. Check both Vercel function logs and Render service logs

## Production Considerations

1. **SSL**: Both Vercel and Render provide HTTPS automatically
2. **CORS**: Update CORS settings in your backend for production domains
3. **Rate Limiting**: Consider adding rate limiting to your API
4. **Monitoring**: Set up monitoring for both services
5. **Custom Domain**: Configure custom domains if needed

## Local Testing with Production URLs

To test locally with production URLs:

1. Create `.env.local` in your project root:
   ```
   REACT_APP_API_URL=https://your-render-app.onrender.com
   REACT_APP_WS_URL=wss://your-render-app.onrender.com
   ```

2. Restart your development server: `npm start`

This will use production APIs while developing locally. 