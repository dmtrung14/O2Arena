# 🚀 Deployment Guide: Trading Platform

## Overview
This trading platform consists of:
- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js matching engine deployed on Render

## 📦 Backend Deployment (Render)

### Step 1: Prepare for Render
1. Ensure your backend code is in the `server/` directory
2. Your `package.json` should be in the root directory
3. No environment variables needed!

### Step 2: Deploy to Render
1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `your-trading-engine` (choose any name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Instance Type**: Free (or paid for better performance)

### Step 3: Note Your Backend URL
Once deployed, your backend will be available at:
```
https://your-trading-engine.onrender.com
```
**Save this URL - you'll need it for frontend deployment!**

### Backend Features Available:
- ✅ Real-time order matching
- ✅ WebSocket market data feeds
- ✅ REST API for orders
- ✅ Portfolio management
- ✅ Multi-market support (Crypto + Stocks)

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Environment Variables
In your Vercel dashboard, add these environment variables:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://your-trading-engine.onrender.com` |
| `REACT_APP_WS_URL` | `wss://your-trading-engine.onrender.com` |

### Step 2: Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Vercel auto-detects React - just click "Deploy"
5. Add environment variables in Settings → Environment Variables

### Step 3: Verify Deployment
Your app will be available at:
```
https://your-app-name.vercel.app
```

---

## 🔧 Environment Configuration Details

### Development vs Production
The app automatically detects the environment:

**Development** (localhost):
```javascript
MATCHING_ENGINE_URL: 'http://localhost:4000'
WS_URL: 'ws://localhost:4000'
```

**Production** (deployed):
```javascript
MATCHING_ENGINE_URL: process.env.REACT_APP_API_URL
WS_URL: process.env.REACT_APP_WS_URL
```

### Required Environment Variables

#### Vercel (Frontend):
- `REACT_APP_API_URL` - Your Render backend URL
- `REACT_APP_WS_URL` - Your Render WebSocket URL (same URL, different protocol)

#### Render (Backend):
- No custom environment variables needed!
- `PORT` - Set automatically by Render
- `NODE_ENV` - Set automatically to "production"

---

## 🏗️ Deployment Architecture

```
Frontend (Vercel)     Backend (Render)
     ┌─────────┐         ┌─────────────┐
     │  React  │────────▶│   Node.js   │
     │   App   │ API/WS  │   Matching  │
     │         │◀────────│   Engine    │
     └─────────┘         └─────────────┘
         │                       │
         │                       │
     Users/Browsers         In-Memory
                           Order Books
```

---

## 🧪 Testing Your Deployment

### 1. Backend Health Check
Visit: `https://your-render-app.onrender.com/api/depth?market_id=4`
Should return BTC-USDC order book data.

### 2. Frontend Functionality
1. Sign in with Google/GitHub
2. Navigate to Markets page
3. Place a test order (try $100k BTC buy)
4. Check Portfolio → Orders tab
5. Verify real-time updates work

### 3. WebSocket Connectivity
Open browser dev tools → Network → WS to verify WebSocket connections.

---

## 🚨 Common Issues & Solutions

### Issue: CORS Errors
**Solution**: Backend already configured with `app.use(require('cors')())` - should work out of the box.

### Issue: WebSocket Connection Failed
**Check**: Ensure `REACT_APP_WS_URL` uses `wss://` (not `ws://`) for HTTPS frontend.

### Issue: API Calls Fail
**Check**: Verify `REACT_APP_API_URL` is correct and backend is deployed successfully.

### Issue: Orders Not Appearing
**Check**: User authentication working and `X-User-Id` header being sent correctly.

---

## 🔄 Updating Your Deployment

### Backend Updates:
1. Push to your GitHub repository
2. Render automatically rebuilds and redeploys

### Frontend Updates:
1. Push to your GitHub repository  
2. Vercel automatically rebuilds and redeploys

### Environment Variables:
- Update in respective dashboards (Render/Vercel)
- Redeploy if needed

---

## 📊 Performance Notes

### Free Tier Limitations:
- **Render Free**: Spins down after 15 minutes of inactivity
- **Vercel Free**: Generous limits for personal projects

### Scaling Considerations:
- Backend uses in-memory storage (resets on restart)
- For production: Consider database for order persistence
- For high traffic: Upgrade to paid tiers

---

## 🎯 Success Checklist

- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel  
- [ ] Environment variables configured
- [ ] CORS working correctly
- [ ] WebSocket connections established
- [ ] Order placement and cancellation working
- [ ] Real-time market data updating
- [ ] Portfolio page showing pending orders
- [ ] Authentication working

Your trading platform is now live! 🚀 