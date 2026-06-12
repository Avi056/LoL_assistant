import React from 'react';
import ReactDOM from 'react-dom/client';
import { AwsRum } from 'aws-rum-web';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

try {
  const config = {
    sessionSampleRate: 1,
    identityPoolId: 'us-east-1:82de0a15-e5b7-4990-aac1-c3a498993097',
    endpoint: 'https://dataplane.rum.us-east-1.amazonaws.com',
    telemetries: ['performance', 'errors', 'http'],
    allowCookies: true,
    enableXRay: false,
    signing: true
  };

  const APPLICATION_ID = 'b29a1e83-73d6-4af7-b3b2-ab20ea67608b';
  const APPLICATION_VERSION = '1.0.0';
  const APPLICATION_REGION = 'us-east-1';

  new AwsRum(APPLICATION_ID, APPLICATION_VERSION, APPLICATION_REGION, config);
} catch (error) {
  // Ignore errors thrown during CloudWatch RUM web client initialization.
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
