import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const AdminDashboard = ({ onClose, isDark, T }) => {
  const { user } = useAuth();
  const [appeals, setAppeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appeals');
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    // 管理者権限チェック（ここでは簡易的に特定のユーザーIDを管理者とする）
    const adminUserIds = ['admin-user-id-1', 'admin-user-id-2']; // 実際の管理者ユーザーIDを設定
    if (!user || !adminUserIds.includes(user.uid)) {
      setLoading(false);
      return;
    }

    // 異議申し立ての監視
    const appealsQuery = query(
      collection(db, 'appeals'),
      where('status', '==', 'pending'),
      orderBy('submittedAt', 'desc')
    );

    const unsubscribeAppeals = onSnapshot(appealsQuery, (snapshot) => {
      const appealsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        submittedAt: doc.data().submittedAt?.toDate(),
      }));
      setAppeals(appealsData);
    });

    // 問題のあるユーザーの監視（信頼度スコアが低い、停止中など）
    const usersQuery = query(
      collection(db, 'users'),
      where('trustScore', '<=', 30),
      orderBy('trustScore', 'asc')
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMisreportAt: doc.data().lastMisreportAt?.toDate(),
        suspendedAt: doc.data().suspendedAt?.toDate(),
      }));
      setUsers(usersData);
      setLoading(false);
    });

    return () => {
      unsubscribeAppeals();
      unsubscribeUsers();
    };
  }, [user]);

  const handleAppealAction = async (appealId, action, reason = '') => {
    setActionLoading(true);
    try {
      const processAppealByAdmin = httpsCallable(functions, 'processAppealByAdmin');
      
      const result = await processAppealByAdmin({
        appealId,
        action: action === 'approve' ? 'approve' : action === 'reject' ? 'deny' : 'escalate',
        adminNote: reason,
      });

      console.log('Appeal processed:', result.data);
      setSelectedAppeal(null);
    } catch (error) {
      console.error('Appeal action error:', error);
      alert('処理中にエラーが発生しました: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserAction = async (userId, action, reason = '') => {
    setActionLoading(true);
    try {
      const manageUserByAdmin = httpsCallable(functions, 'manageUserByAdmin');
      
      const result = await manageUserByAdmin({
        userId,
        action,
        reason,
      });

      console.log('User managed:', result.data);
      setSelectedUser(null);
    } catch (error) {
      console.error('User action error:', error);
      alert('処理中にエラーが発生しました: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };
    }
  };

  if (loading) {
    return (
      <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:5001,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:isDark?"rgba(5,8,16,0.98)":"white",borderRadius:20,padding:24,color:T.text}}>
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div style={{position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.5)",zIndex:5001,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:isDark?"rgba(5,8,16,0.98)":"white",borderRadius:20,padding:24,maxWidth:1000,width:"90%",maxHeight:"80vh",overflowY:"auto",color:T.text}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{margin:0,fontSize:20,fontWeight:900}}>管理者ダッシュボード</h2>
          <button onClick={onClose} style={{background:"transparent",border:"none",fontSize:24,cursor:"pointer",color:T.muted}}>×</button>
        </div>

        {/* タブナビゲーション */}
        <div style={{display:"flex",gap:6,marginBottom:20}}>
          <button
            onClick={() => setActiveTab('appeals')}
            style={{
              flex:1,
              padding:"8px 0",
              background:activeTab==='appeals'?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"transparent",
              border:`1px solid ${activeTab==='appeals'?T.sub:T.border}`,
              borderRadius:999,
              color:activeTab==='appeals'?T.text:T.muted,
              fontSize:12,
              fontWeight:activeTab==='appeals'?800:500,
              cursor:"pointer"
            }}
          >
            異議申し立て ({appeals.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              flex:1,
              padding:"8px 0",
              background:activeTab==='users'?(isDark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"):"transparent",
              border:`1px solid ${activeTab==='users'?T.sub:T.border}`,
              borderRadius:999,
              color:activeTab==='users'?T.text:T.muted,
              fontSize:12,
              fontWeight:activeTab==='users'?800:500,
              cursor:"pointer"
            }}
          >
            ユーザー管理 ({users.length})
          </button>
        </div>

        {activeTab === 'appeals' && (
          <div>
            <h3 style={{margin:"0 0 15px",fontSize:16,fontWeight:700}}>審査待ちの異議申し立て</h3>
            
            {appeals.length === 0 ? (
              <div style={{textAlign:"center",padding:40,color:T.muted}}>
                審査待ちの異議申し立てはありません
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {appeals.map(appeal => (
                  <div key={appeal.id} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:16,cursor:"pointer"}} onClick={() => setSelectedAppeal(appeal)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>
                          投稿ID: {appeal.postId.slice(-8)}
                        </div>
                        <div style={{fontSize:12,color:T.muted}}>
                          提出日時: {appeal.submittedAt?.toLocaleString('ja-JP')}
                        </div>
                      </div>
                      <div style={{fontSize:12,color:"#f59e0b",background:"rgba(245,158,11,0.1)",padding:"2px 8px",borderRadius:999}}>
                        審査待ち
                      </div>
                    </div>
                    <div style={{fontSize:13,color:T.sub,lineHeight:1.5}}>
                      {appeal.appealText.length > 100 ? `${appeal.appealText.slice(0, 100)}...` : appeal.appealText}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h3 style={{margin:"0 0 15px",fontSize:16,fontWeight:700}}>問題のあるユーザー</h3>
            
            {users.length === 0 ? (
              <div style={{textAlign:"center",padding:40,color:T.muted}}>
                問題のあるユーザーはいません
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {users.map(user => (
                  <div key={user.id} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:16,cursor:"pointer"}} onClick={() => setSelectedUser(user)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>
                          ユーザーID: {user.id.slice(-8)}
                        </div>
                        <div style={{fontSize:12,color:T.muted}}>
                          信頼度スコア: {user.trustScore || 50}
                        </div>
                      </div>
                      <div style={{
                        fontSize:12,
                        color:user.suspended?"#ef4444":"#f59e0b",
                        background:user.suspended?"rgba(239,68,68,0.1)":"rgba(245,158,11,0.1)",
                        padding:"2px 8px",
                        borderRadius:999
                      }}>
                        {user.suspended ? "停止中" : "要注意"}
                      </div>
                    </div>
                    <div style={{fontSize:13,color:T.sub}}>
                      誤報告回数: {user.misreports || 0}回
                      {user.lastMisreportAt && ` | 最終誤報告: ${user.lastMisreportAt.toLocaleDateString('ja-JP')}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedAppeal && (
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:20,marginTop:20}}>
            <h3 style={{margin:"0 0 15px",fontSize:16,fontWeight:700}}>異議申し立て詳細</h3>
            
            <div style={{marginBottom:15}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>削除された投稿:</div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:13}}>
                {selectedAppeal.postData?.text || '投稿データを取得できません'}
              </div>
            </div>

            <div style={{marginBottom:15}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>報告理由:</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {selectedAppeal.reportReasons?.map((reason, index) => (
                  <span key={index} style={{fontSize:12,color:"#ef4444",background:"rgba(239,68,68,0.1)",padding:"2px 8px",borderRadius:999}}>
                    {reason}
                  </span>
                ))}
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>異議申し立て内容:</div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:13,lineHeight:1.5}}>
                {selectedAppeal.appealText}
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              <button
                onClick={() => handleAppealAction(selectedAppeal.id, 'approve')}
                disabled={actionLoading}
                style={{flex:1,padding:"10px 16px",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",opacity:actionLoading?0.5:1}}
              >
                {actionLoading ? '処理中...' : '承認（復元）'}
              </button>
              <button
                onClick={() => handleAppealAction(selectedAppeal.id, 'reject')}
                disabled={actionLoading}
                style={{flex:1,padding:"10px 16px",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",opacity:actionLoading?0.5:1}}
              >
                {actionLoading ? '処理中...' : '却下'}
              </button>
              <button
                onClick={() => setSelectedAppeal(null)}
                style={{padding:"10px 16px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,color:T.text,cursor:"pointer"}}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {selectedUser && (
          <div style={{borderTop:`1px solid ${T.border}`,paddingTop:20,marginTop:20}}>
            <h3 style={{margin:"0 0 15px",fontSize:16,fontWeight:700}}>ユーザー詳細</h3>
            
            <div style={{marginBottom:15}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>ユーザーID:</div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:13,fontFamily:"monospace"}}>
                {selectedUser.id}
              </div>
            </div>

            <div style={{marginBottom:15}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>信頼度スコア:</div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:12}}>
                <div style={{fontSize:18,fontWeight:900,color:selectedUser.trustScore <= 20 ? "#ef4444" : selectedUser.trustScore <= 40 ? "#f59e0b" : "#10b981"}}>
                  {selectedUser.trustScore || 50}
                </div>
              </div>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:5}}>統計情報:</div>
              <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:8,padding:12,fontSize:13}}>
                <div>誤報告回数: {selectedUser.misreports || 0}回</div>
                {selectedUser.lastMisreportAt && <div>最終誤報告: {selectedUser.lastMisreportAt.toLocaleString('ja-JP')}</div>}
                {selectedUser.suspended && <div style={{color:"#ef4444",marginTop:5}}>停止理由: {selectedUser.suspensionReason}</div>}
              </div>
            </div>

            <div style={{display:"flex",gap:10}}>
              {!selectedUser.suspended ? (
                <button
                  onClick={() => handleUserAction(selectedUser.id, 'suspend')}
                  disabled={actionLoading}
                  style={{flex:1,padding:"10px 16px",background:"linear-gradient(135deg,#ef4444,#dc2626)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",opacity:actionLoading?0.5:1}}
                >
                  {actionLoading ? '処理中...' : 'アカウント停止'}
                </button>
              ) : (
                <button
                  onClick={() => handleUserAction(selectedUser.id, 'unsuspend')}
                  disabled={actionLoading}
                  style={{flex:1,padding:"10px 16px",background:"linear-gradient(135deg,#10b981,#059669)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",opacity:actionLoading?0.5:1}}
                >
                  {actionLoading ? '処理中...' : 'アカウント復帰'}
                </button>
              )}
              <button
                onClick={() => handleUserAction(selectedUser.id, 'reset_score')}
                disabled={actionLoading}
                style={{flex:1,padding:"10px 16px",background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",color:"white",border:"none",borderRadius:8,fontWeight:700,cursor:"pointer",opacity:actionLoading?0.5:1}}
              >
                {actionLoading ? '処理中...' : 'スコアリセット'}
              </button>
              <button
                onClick={() => setSelectedUser(null)}
                style={{padding:"10px 16px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,color:T.text,cursor:"pointer"}}
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;