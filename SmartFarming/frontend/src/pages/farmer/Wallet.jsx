import React, { useState, useEffect } from 'react';
import { checkoutAPI } from '../../services/api';
import toast from 'react-hot-toast';
import SellerLayout from './SellerLayout';
import { FiDollarSign, FiTrendingUp, FiArrowDown, FiArrowUp, FiClock, FiRefreshCw } from 'react-icons/fi';

export default function FarmerWallet() {
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const res = await checkoutAPI.getWallet();
      if (res.data?.success) {
        setWallet(res.data.wallet);
        setStats(res.data.stats);
      }
    } catch {
      toast.error('Failed to load wallet');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await checkoutAPI.getWalletTransactions();
      setTransactions(res.data?.transactions || []);
    } catch { /* silent */ }
  };

  const content = (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <h2 style={styles.pageTitle}>💰 Wallet & Earnings</h2>
        <button onClick={() => { fetchWallet(); fetchTransactions(); }} style={styles.refreshBtn}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <p style={{color:'#94a3b8',marginTop:12}}>Loading wallet...</p>
        </div>
      ) : (
        <>
          {/* Balance Card */}
          <div style={styles.balanceCard}>
            <div style={styles.balanceLabel}>Available Balance</div>
            <div style={styles.balanceAmount}>
              ₹{parseFloat(wallet?.available_balance || 0).toFixed(2)}
            </div>
            <div style={styles.balanceSub}>
              Total Earnings: ₹{parseFloat(wallet?.total_earnings || 0).toFixed(2)}
            </div>
          </div>

          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: 'rgba(34,197,94,0.1)'}}>
                <FiTrendingUp size={20} color="#22c55e" />
              </div>
              <div style={styles.statValue}>₹{parseFloat(wallet?.total_earnings || 0).toFixed(0)}</div>
              <div style={styles.statLabel}>Total Earnings</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: 'rgba(245,158,11,0.1)'}}>
                <FiClock size={20} color="#f59e0b" />
              </div>
              <div style={styles.statValue}>₹{parseFloat(wallet?.pending_settlement || 0).toFixed(0)}</div>
              <div style={styles.statLabel}>Pending</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: 'rgba(239,68,68,0.1)'}}>
                <FiDollarSign size={20} color="#ef4444" />
              </div>
              <div style={styles.statValue}>₹{parseFloat(wallet?.total_commission || 0).toFixed(0)}</div>
              <div style={styles.statLabel}>Commission Paid</div>
            </div>
            <div style={styles.statCard}>
              <div style={{...styles.statIcon, background: 'rgba(59,130,246,0.1)'}}>
                <FiArrowUp size={20} color="#3b82f6" />
              </div>
              <div style={styles.statValue}>{stats?.delivered || 0}</div>
              <div style={styles.statLabel}>Orders Delivered</div>
            </div>
          </div>

          {/* Transactions */}
          <div style={styles.txnCard}>
            <h3 style={styles.txnTitle}>📜 Transaction History</h3>

            {transactions.length === 0 ? (
              <div style={styles.emptyTxn}>
                <div style={{fontSize:40}}>💸</div>
                <p style={{color:'#94a3b8',marginTop:8}}>No transactions yet</p>
                <p style={{color:'#64748b',fontSize:12}}>Complete orders to see earnings here</p>
              </div>
            ) : (
              <div style={styles.txnList}>
                {transactions.map((txn, i) => (
                  <div key={i} style={styles.txnRow}>
                    <div style={{
                      ...styles.txnIcon,
                      background: txn.type === 'credit' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    }}>
                      {txn.type === 'credit' ? <FiArrowDown color="#22c55e" size={16} /> : <FiArrowUp color="#ef4444" size={16} />}
                    </div>
                    <div style={{flex:1}}>
                      <div style={styles.txnDesc}>{txn.description || `Order #${txn.order_id}`}</div>
                      <div style={styles.txnMeta}>
                        {txn.order_number && <span>#{txn.order_number}</span>}
                        {txn.commission > 0 && <span style={{color:'#f59e0b'}}> • Commission: ₹{parseFloat(txn.commission).toFixed(0)}</span>}
                      </div>
                      <div style={styles.txnDate}>
                        {txn.created_at ? new Date(txn.created_at).toLocaleString('en-IN', {
                          day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'
                        }) : ''}
                      </div>
                    </div>
                    <div style={styles.txnAmountCol}>
                      <div style={{
                        ...styles.txnAmount,
                        color: txn.type === 'credit' ? '#22c55e' : '#ef4444',
                      }}>
                        {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.net_amount || txn.amount || 0).toFixed(2)}
                      </div>
                      <div style={styles.txnBalance}>Bal: ₹{parseFloat(txn.balance_after || 0).toFixed(0)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return <SellerLayout>{content}</SellerLayout>;
}

const styles = {
  page: { fontFamily: "'Inter', sans-serif" },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: 0 },
  refreshBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '8px 14px', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer' },

  loadingBox: { textAlign: 'center', padding: 60 },
  spinner: { width: 32, height: 32, border: '3px solid #334155', borderTop: '3px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' },

  // Balance Card
  balanceCard: { background: 'linear-gradient(135deg, #16a34a, #15803d, #064e3b)', borderRadius: 20, padding: '32px 28px', marginBottom: 20, position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(22,163,74,0.25)' },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: 500 },
  balanceAmount: { fontSize: 42, fontWeight: 800, color: '#fff', margin: '8px 0', letterSpacing: '-1px' },
  balanceSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },

  // Stats
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 },
  statCard: { background: 'rgba(30,41,59,0.6)', borderRadius: 14, padding: 16, textAlign: 'center', border: '1px solid rgba(148,163,184,0.08)' },
  statIcon: { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' },
  statValue: { fontSize: 18, fontWeight: 800, color: '#f1f5f9' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Transactions
  txnCard: { background: 'rgba(30,41,59,0.6)', borderRadius: 16, padding: 20, border: '1px solid rgba(148,163,184,0.08)' },
  txnTitle: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 },
  emptyTxn: { textAlign: 'center', padding: 40 },
  txnList: { display: 'flex', flexDirection: 'column' },
  txnRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid rgba(148,163,184,0.06)' },
  txnIcon: { width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  txnDesc: { fontSize: 14, fontWeight: 600, color: '#e2e8f0' },
  txnMeta: { fontSize: 11, color: '#64748b', marginTop: 2 },
  txnDate: { fontSize: 11, color: '#475569', marginTop: 2 },
  txnAmountCol: { textAlign: 'right', minWidth: 80 },
  txnAmount: { fontSize: 16, fontWeight: 700 },
  txnBalance: { fontSize: 10, color: '#475569', marginTop: 2 },
};
