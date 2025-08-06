import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

const StrategyBuilder = () => {
  const [optionChain, setOptionChain] = useState([]);
  const [legs, setLegs] = useState([]);
  const [spotPrice, setSpotPrice] = useState(25000);
  const [payoff, setPayoff] = useState([]);
  const [summary, setSummary] = useState({});
  const [aiSuggestion, setAiSuggestion] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/options')
      .then(res => setOptionChain(res.data))
      .catch(console.error);
  }, []);

  const simulate = () => {
    axios.post('http://localhost:8000/strategy/simulate', {
      legs,
      spot_price: spotPrice
    }).then(res => {
      setPayoff(res.data.payoff);
      setSummary({
        total_premium: res.data.total_premium,
        max_profit: res.data.max_profit,
        max_loss: res.data.max_loss
      });
    }).catch(console.error);
  };

  const suggestAdjustment = () => {
    axios.post('http://localhost:8000/strategy/adjust', {
      legs,
      spot_price: spotPrice
    }).then(res => setAiSuggestion(res.data.suggestions))
    .catch(console.error);
  };

  const chartData = {
    labels: payoff.map(p => p.price),
    datasets: [
      {
        label: 'PNL',
        data: payoff.map(p => p.pnl),
        fill: false,
        borderColor: 'rgb(75, 192, 192)'
      }
    ]
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Options Strategy Builder</h1>
      <input type="number" value={spotPrice} onChange={e => setSpotPrice(Number(e.target.value))} className="border p-2" placeholder="Spot Price" />
      <div className="my-4">
        <button className="bg-blue-500 text-white px-4 py-2 mr-2" onClick={simulate}>Simulate</button>
        <button className="bg-green-600 text-white px-4 py-2" onClick={suggestAdjustment}>Suggest Adjustment</button>
      </div>

      {summary.total_premium !== undefined && (
        <div className="bg-gray-100 p-4 mb-4">
          <p>Total Premium: {summary.total_premium}</p>
          <p>Max Profit: {summary.max_profit}</p>
          <p>Max Loss: {summary.max_loss}</p>
        </div>
      )}

      {payoff.length > 0 && <Line data={chartData} />}

      {aiSuggestion.length > 0 && (
        <div className="bg-yellow-100 p-4 mt-4">
          <h2 className="text-lg font-semibold">AI Suggestions:</h2>
          <ul>
            {aiSuggestion.map((s, i) => <li key={i}>👉 {s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default StrategyBuilder;
