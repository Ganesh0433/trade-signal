import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

// Initialize Firebase (move to backend in production to secure apiKey)
const firebaseConfig = {
  apiKey: "AIzaSyAuExBvYAqE7P4viDDG0wEf_o_0TR80up0",
  authDomain: "fir-trading-72b86.firebaseapp.com",
  projectId: "fir-trading-72b86",
  storageBucket: "fir-trading-72b86.firebasestorage.app",
  messagingSenderId: "497854928189",
  appId: "1:497854928189:web:ce9e0dab4bcdc771c02154"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function TradePairs() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({
    totalDocs: 0,
    validDocs: 0,
    entries: 0,
    exits: 0,
    invalid: 0,
    rawData: []
  });
  const [alert, setAlert] = useState({ show: false, message: '' });

  useEffect(() => {
    let previousTradeIds = new Set();

    const q = query(
      collection(db, 'trade_predictions'),
      orderBy('timestamp', 'desc'),
     
      limit(5)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        try {
          const rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Detect new trades
          const currentTradeIds = new Set(rawDocs.map(doc => doc.id));
          const newTrades = rawDocs.filter(doc => !previousTradeIds.has(doc.id));
          previousTradeIds = currentTradeIds;

          // Show alert for new trades
          newTrades.forEach(trade => {
            if (trade.Position_Type && trade.Entry_Price) {
              setAlert({
                show: true,
                message: `New Entry: ${trade.symbol} ${trade.Position_Type} at ${trade.Entry_Price}`
              });
            } else if (trade.Exit_Position && trade.Exit_Price) {
              setAlert({
                show: true,
                message: `New Exit: ${trade.symbol} ${trade.Exit_Position} at ${trade.Exit_Price}`
              });
            }
          });

          const processedTrades = rawDocs.map(doc => {
            const baseData = {
              id: doc.id,
              symbol: doc.symbol,
              Date: doc.Date,
              Time: doc.Time,
              valid: true
            };

            if (doc.Position_Type && doc.Entry_Price) {
              return {
                ...baseData,
                type: 'entry',
                positionType: doc.Position_Type,
                price: doc.Entry_Price,
                profitLoss: doc.Profit_Loss
              };
            }
            else if (doc.Exit_Position && doc.Exit_Price) {
              return {
                ...baseData,
                type: 'exit',
                positionType: doc.Exit_Position,
                price: doc.Exit_Price,
                profitLoss: doc.Profit_Loss
              };
            }

            return {
              ...baseData,
              valid: false,
              reason: 'Does not match entry or exit structure'
            };
          });

          const validTrades = processedTrades.filter(trade => trade.valid);
          const entryCount = validTrades.filter(trade => trade.type === 'entry').length;
          const exitCount = validTrades.filter(trade => trade.type === 'exit').length;
          const invalidCount = processedTrades.filter(trade => !trade.valid).length;

          setDebugInfo({
            totalDocs: rawDocs.length,
            validDocs: validTrades.length,
            entries: entryCount,
            exits: exitCount,
            invalid: invalidCount,
            rawData: rawDocs.slice(0, 3)
          });

          setTrades(validTrades.slice(0, 10));
          setLoading(false);

          // Auto-hide alert after 3 seconds
          if (newTrades.length > 0) {
            setTimeout(() => {
              setAlert({ show: false, message: '' });
            }, 1000000);
          }
        } catch (e) {
          console.error('Processing error:', e);
          setError(`Data processing error: ${e.message}`);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        setError(`Firestore error: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Format date and time for better display
  const formatDateTime = (dateStr, timeStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = timeStr.split(':');
      const date = new Date(year, month - 1, day, hours, minutes);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return `${dateStr} ${timeStr}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              {trades.length > 0 ? trades[0].symbol : 'Trade'} Trade Signals Dashboard
            </h1>
            <p className="text-gray-600 mt-1">Real-time trading signals and positions</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700">
                  Error loading trade data: {error}
                </p>
              </div>
            </div>
          </div>
        )}
{alert.show && (
  <div className="fixed inset-0 flex items-center justify-center z-50">
    <div className="bg-red-600 text-white px-8 py-6 rounded-xl  scale-125 relative">
      <button
        onClick={() => setAlert({ show: false, message: '' })}
        className="absolute top-2 right-2 text-white hover:text-black-500 focus:outline-none transition-colors duration-200 bg-black-800 hover:bg-white-500 rounded-full p-1"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <p className="text-lg font-semibold">{alert.message}</p>
    </div>
  </div>
)}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Loading trade signals...</p>
            <p className="text-sm text-gray-400 mt-2">Connecting to real-time data</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="bg-white p-8 rounded-xl shadow-sm text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No signals found</h3>
            <p className="mt-1 text-sm text-gray-500">
              There are currently no active trade signals. Please check back later.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 bg-gray-100 p-4 border-b font-medium text-gray-700 text-sm">
              <div className="col-span-2">Symbol</div>
              <div className="col-span-2">Date/Time</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Position</div>
              <div className="col-span-2">Price</div>
            </div>
            
            {trades.map((trade) => (
              <div key={trade.id} className="grid grid-cols-12 p-4 border-b hover:bg-gray-50 transition-colors duration-150">
                <div className="col-span-2 font-medium text-gray-900 flex items-center">
                  {trade.symbol}
                </div>
                <div className="col-span-2 text-gray-600 text-sm flex items-center">
                  {formatDateTime(trade.Date, trade.Time)}
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trade.type === 'entry' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {trade.type === 'entry' ? 'Entry' : 'Exit'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    trade.positionType === 'Long' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>2
                    {trade.positionType}
                  </span>
                </div>
                <div className="col-span-2 font-medium text-gray-900">
                  {trade.price}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}