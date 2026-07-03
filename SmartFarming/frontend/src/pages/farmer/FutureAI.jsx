import React from 'react';
import { useNavigate } from 'react-router-dom';
import SellerLayout from './SellerLayout';

const FUTURE_FEATURES = [
  {
    icon: '🌱',
    title: 'Crop Growth Monitoring',
    description: 'Track your crops from seed to harvest with satellite imagery and IoT sensors. Get real-time health scores for each field.',
    eta: 'Q3 2026',
    progress: 65,
  },
  {
    icon: '📸',
    title: 'Image-Based Disease Identification',
    description: 'Upload a photo of any plant and our AI will instantly identify diseases, pests, and nutrient deficiencies with 95%+ accuracy.',
    eta: 'Q4 2026',
    progress: 45,
  },
  {
    icon: '📋',
    title: 'Smart Farming Reports',
    description: 'Automated weekly and monthly reports with AI insights on soil health, crop performance, water usage, and profitability analysis.',
    eta: 'Q3 2026',
    progress: 55,
  },
  {
    icon: '🗓️',
    title: 'Seasonal Planning',
    description: 'AI-powered seasonal calendar that suggests the best crops, planting dates, and expected harvest times based on your location and soil.',
    eta: 'Q4 2026',
    progress: 35,
  },
  {
    icon: '🌾',
    title: 'Harvest Prediction',
    description: 'Predict exact harvest dates and expected quantities using satellite data, weather patterns, and crop growth algorithms.',
    eta: 'Q1 2027',
    progress: 25,
  },
  {
    icon: '📊',
    title: 'Farm Productivity Analysis',
    description: 'Compare your farm\'s productivity with regional averages. Get actionable recommendations to improve yield per hectare.',
    eta: 'Q1 2027',
    progress: 20,
  },
];

export default function FarmerFutureAI() {
  const navigate = useNavigate();

  return (
    <SellerLayout title="Future AI" subtitle="Upcoming smart farming technologies">
      {/* Hero Banner */}
      <div className="seller-card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, #052e16, #14532d, #166534)', color: '#fff', border: 'none' }}>
        <div className="seller-card-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 800, color: '#4ade80' }}>
            🔮 The Future of Smart Farming
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.9rem', opacity: 0.8, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            We're building the next generation of AI-powered farming tools. Here's what's coming soon to help you grow smarter, earn more, and farm sustainably.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {[
              { icon: '🤖', label: 'AI Powered', value: '6 tools' },
              { icon: '📡', label: 'IoT Ready', value: 'Sensors' },
              { icon: '🛰️', label: 'Satellite', value: 'Imagery' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', margin: '0 0 4px' }}>{s.icon}</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: '0.68rem', opacity: 0.6 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="seller-future-grid">
        {FUTURE_FEATURES.map((feature, i) => (
          <div key={i} className="seller-future-card">
            <div className="future-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>

            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#166534' }}>Development Progress</span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#166534' }}>{feature.progress}%</span>
              </div>
              <div className="seller-progress-bar" style={{ height: 6 }}>
                <div className="seller-progress-fill green" style={{ width: `${feature.progress}%` }} />
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '0.68rem', color: '#9ca3af' }}>
                📅 Expected: {feature.eta}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="seller-card" style={{ marginTop: 24 }}>
        <div className="seller-card-body" style={{ textAlign: 'center', padding: 28 }}>
          <h3 style={{ margin: '0 0 8px', color: '#14532d', fontSize: '1.1rem' }}>🚀 Want Early Access?</h3>
          <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#6b7280' }}>
            Be the first to try new features as they launch. Premium members get exclusive early access.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="seller-btn seller-btn-primary" onClick={() => navigate('/farmer/ai-tools')}>
              🤖 Try Current AI Tools
            </button>
            <button className="seller-btn seller-btn-secondary" onClick={() => navigate('/farmer/agribot')}>
              🌱 Chat with AgriBot
            </button>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
