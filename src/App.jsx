import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, getDoc, onSnapshot, 
  updateDoc, deleteDoc, addDoc, query 
} from 'firebase/firestore';
import { 
  LayoutDashboard, ListTodo, User, Users, AlertCircle, 
  FileEdit, ClipboardCheck, CheckCircle2, Files, MessageSquare, 
  Search, Filter, Paperclip, Upload, X, Clock, Calendar, 
  ChevronRight, UserCircle, CalendarDays, ChevronLeft, LogOut, 
  Lock, Plus, Trash2, FolderKanban, FolderPlus, Download, 
  Check, Edit3, RotateCcw, AlertTriangle, FileText
} from 'lucide-react';

// --- [Firebase 초기화] ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'k-agro-erp-v1';

// --- [공통 데이터] ---
const MOCK_USERS = [
  { id: 'u1', name: '김영곤', role: 'admin', dept: '대표이사', pin: '6070' },
  { id: 'u2', name: '김세진', role: 'manager', dept: '본부장', pin: '4680' },
  { id: 'u3', name: '김은경', role: 'manager', dept: '팀장', pin: '7026' },
  { id: 'u4', name: '고경석', role: 'employee', dept: '사원', pin: '7026' }, 
  { id: 'u5', name: '강혜주', role: 'employee', dept: '사원', pin: '3186' },
];

const STATUS_MAP = {
  'todo': { label: '시작 전', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  'in_progress': { label: '진행 중', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'review': { label: '검토 대기', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'revision': { label: '수정 요청', color: 'bg-red-100 text-red-700 border-red-200' },
  'done': { label: '완료', color: 'bg-green-100 text-green-700 border-green-200' },
};

// --- [Main App Component] ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentUserInfo, setCurrentUserInfo] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("인증 에러:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (userInfo) => {
    setCurrentUserInfo(userInfo);
  };

  if (!isInitialized) return <div className="h-screen flex items-center justify-center font-bold">시스템을 불러오는 중...</div>;
  if (!currentUserInfo) return <LoginScreen onLogin={handleLogin} />;

  return <Dashboard currentUser={currentUserInfo} onLogout={() => setCurrentUserInfo(null)} user={user} />;
}

function Dashboard({ currentUser, onLogout, user }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeProject, setActiveProject] = useState('');
  const [activeMenu, setActiveMenu] = useState('calendar');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskDefaultDate, setNewTaskDefaultDate] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date('2026-04-27'));

  // Firestore 실시간 구독 (RULE 1 & 2 준수)
  useEffect(() => {
    if (!user) return;

    const projPath = collection(db, 'artifacts', appId, 'public', 'data', 'projects');
    const taskPath = collection(db, 'artifacts', appId, 'public', 'data', 'tasks');

    const unsubProj = onSnapshot(projPath, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProjects(data);
      if (data.length > 0 && !activeProject) setActiveProject(data[0].id);
    }, (err) => console.error("프로젝트 구독 에러:", err));

    const unsubTask = onSnapshot(taskPath, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTasks(data);
    }, (err) => console.error("업무 구독 에러:", err));

    return () => { unsubProj(); unsubTask(); };
  }, [user, activeProject]);

  const TODAY = new Date('2026-04-27');
  const isUrgent = (dateStr) => {
    const due = new Date(dateStr);
    const diff = Math.ceil((due - TODAY) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 3;
  };

  // 필터링된 데이터 (RULE 2: 메모리 내 필터링)
  const aliveProjects = projects.filter(p => !p.isDeleted);
  const aliveTasks = tasks.filter(t => !t.isDeleted);
  
  const projectTasks = aliveTasks.filter(t => t.projectId === activeProject);

  const filteredTasks = useMemo(() => {
    switch (activeMenu) {
      case 'mine': return aliveTasks.filter(t => t.assigneeId === currentUser.id);
      case 'urgent': return aliveTasks.filter(t => isUrgent(t.dueDate) && t.status !== 'done');
      case 'revision': return aliveTasks.filter(t => t.status === 'revision');
      case 'review': return aliveTasks.filter(t => t.status === 'review');
      case 'done': return aliveTasks.filter(t => t.status === 'done');
      case 'all': return projectTasks;
      default: return projectTasks;
    }
  }, [activeMenu, aliveTasks, projectTasks, currentUser.id]);

  // 핸들러 함수들
  const handleCreateProject = async () => {
    const name = window.prompt("새 프로젝트 이름을 입력하세요:");
    if (!name?.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'projects'), {
      name: name.trim(),
      isDeleted: false,
      createdAt: new Date().toISOString()
    });
  };

  const handleDeleteProject = async (pId) => {
    if (!window.confirm("프로젝트를 휴지통으로 이동하시겠습니까? 관련 업무도 함께 이동됩니다.")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'projects', pId), { isDeleted: true });
    const relatedTasks = tasks.filter(t => t.projectId === pId);
    for (const t of relatedTasks) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', t.id), { isDeleted: true });
    }
  };

  const handleAddTask = async (data) => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      ...data,
      isDeleted: false,
      status: 'todo',
      attachments: [],
      uploadedFiles: [],
      comments: [],
      issues: [],
      createdAt: new Date().toISOString()
    });
    setIsAddingTask(false);
  };

  const handleUpdateTask = async (taskId, updates) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), updates);
    if (selectedTask?.id === taskId) setSelectedTask({ ...selectedTask, ...updates });
  };

  const handleRestore = async (id, type) => {
    const coll = type === 'project' ? 'projects' : 'tasks';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', coll, id), { isDeleted: false });
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      {/* 📌 사이드바 (피드백 반영: 배치 최적화) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
        <div className="p-6 bg-slate-950">
          <h1 className="text-emerald-500 font-black text-xl mb-6 tracking-tighter text-center">
            (주)케이아그로솔루션즈
          </h1>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-500 font-bold uppercase">선택된 프로젝트</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2.5 cursor-pointer outline-none focus:ring-2 focus:ring-emerald-500"
              value={activeProject}
              onChange={(e) => {
                setActiveProject(e.target.value);
                if (['mine', 'urgent', 'revision', 'review', 'done'].indexOf(activeMenu) === -1) setActiveMenu('all');
              }}
            >
              {aliveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              {aliveProjects.length === 0 && <option>프로젝트 없음</option>}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          <div>
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">통합 대시보드</p>
            <SidebarItem icon={CalendarDays} label="전체 일정 캘린더" active={activeMenu === 'calendar'} onClick={() => setActiveMenu('calendar')} />
            <SidebarItem icon={FolderKanban} label="프로젝트 마스터" active={activeMenu === 'projects'} onClick={() => setActiveMenu('projects')} />
          </div>

          <div>
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">내 업무 및 필터</p>
            <SidebarItem icon={ListTodo} label="선택 프로젝트 업무" active={activeMenu === 'all'} onClick={() => setActiveMenu('all')} />
            <SidebarItem icon={User} label="내가 담당한 업무" active={activeMenu === 'mine'} onClick={() => setActiveMenu('mine')} />
            <SidebarItem icon={AlertCircle} label="마감 임박 업무" active={activeMenu === 'urgent'} onClick={() => setActiveMenu('urgent')} badge={aliveTasks.filter(t=>isUrgent(t.dueDate)&&t.status!=='done').length} badgeColor="bg-red-500" />
            <SidebarItem icon={FileEdit} label="수정 요청 업무" active={activeMenu === 'revision'} onClick={() => setActiveMenu('revision')} badge={aliveTasks.filter(t=>t.status==='revision').length} badgeColor="bg-orange-500" />
            <SidebarItem icon={ClipboardCheck} label="검토 대기 업무" active={activeMenu === 'review'} onClick={() => setActiveMenu('review')} />
            <SidebarItem icon={CheckCircle2} label="완료된 업무" active={activeMenu === 'done'} onClick={() => setActiveMenu('done')} />
          </div>

          <div>
            <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">데이터 리포트</p>
            <SidebarItem icon={Files} label="통합 업로드 자료함" active={activeMenu === 'files'} onClick={() => setActiveMenu('files')} />
            <SidebarItem icon={Users} label="담당자별 현황" active={activeMenu === 'assignees'} onClick={() => setActiveMenu('assignees')} />
          </div>

          <div className="pt-4 border-t border-slate-800">
            <SidebarItem icon={Trash2} label="시스템 휴지통" active={activeMenu === 'trash'} onClick={() => setActiveMenu('trash')} badge={projects.filter(p=>p.isDeleted).length + tasks.filter(t=>t.isDeleted).length} badgeColor="bg-slate-600" />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-extrabold text-gray-800 flex items-center gap-2">
            {getMenuTitle(activeMenu)}
            {['calendar', 'projects', 'trash', 'assignees', 'files'].indexOf(activeMenu) === -1 && 
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{filteredTasks.length}</span>
            }
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                if(aliveProjects.length === 0) return alert("프로젝트를 먼저 생성하세요.");
                setNewTaskDefaultDate('2026-04-27');
                setIsAddingTask(true);
              }}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> 새 업무 추가
            </button>
            <div className="h-8 w-px bg-gray-200"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{currentUser.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{currentUser.dept}</p>
              </div>
              <button onClick={onLogout} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"><LogOut size={20} /></button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          {activeMenu === 'calendar' && (
            <CalendarView 
              tasks={aliveTasks} projects={aliveProjects} currentDate={calendarDate} setCurrentDate={setCalendarDate}
              onTaskClick={setSelectedTask} onDateClick={(d)=>{setNewTaskDefaultDate(d); setIsAddingTask(true);}}
            />
          )}

          {activeMenu === 'projects' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {aliveProjects.map(p => (
                <ProjectCard key={p.id} project={p} tasks={aliveTasks} onAddTask={() => {setActiveProject(p.id); setIsAddingTask(true);}} onDelete={() => handleDeleteProject(p.id)} onSelectTask={setSelectedTask} />
              ))}
              <button onClick={handleCreateProject} className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-gray-400 font-bold hover:border-emerald-500 hover:text-emerald-500 transition-all flex flex-col items-center gap-4">
                <FolderPlus size={48} /> 새 프로젝트 생성
              </button>
            </div>
          )}

          {activeMenu === 'trash' && (
            <TrashView 
              trashProjects={projects.filter(p=>p.isDeleted)} 
              trashTasks={tasks.filter(t=>t.isDeleted)}
              onRestore={handleRestore}
            />
          )}

          {activeMenu === 'files' && (
            <FilesView tasks={aliveTasks} projects={aliveProjects} onDownload={(f)=>alert(`[${f}] 실제 다운로드는 추후 업데이트 예정입니다.`)} />
          )}

          {activeMenu === 'assignees' && (
            <AssigneeStats tasks={aliveTasks} users={MOCK_USERS} onSelectTask={setSelectedTask} />
          )}

          {['calendar', 'projects', 'trash', 'files', 'assignees'].indexOf(activeMenu) === -1 && (
            <TaskListView tasks={filteredTasks} projects={aliveProjects} onSelect={setSelectedTask} isUrgent={isUrgent} />
          )}
        </div>
      </main>

      {/* Modals */}
      {selectedTask && (
        <TaskDetailModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={(upd) => handleUpdateTask(selectedTask.id, upd)}
          onDelete={() => { if(window.confirm("업무를 휴지통으로 보낼까요?")) { handleUpdateTask(selectedTask.id, {isDeleted: true}); setSelectedTask(null); }}}
          currentUser={currentUser}
        />
      )}

      {isAddingTask && (
        <AddTaskModal 
          projects={aliveProjects} activeProjectId={activeProject} users={MOCK_USERS} currentUser={currentUser} 
          defaultDate={newTaskDefaultDate} onClose={() => setIsAddingTask(false)} onAdd={handleAddTask} 
        />
      )}
    </div>
  );
}

// --- [Sub Components] ---

function TaskDetailModal({ task, onClose, onUpdate, onDelete, currentUser }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(task.description);
  const [activeTab, setActiveTab] = useState('info'); // info, issues, comments
  const [newComment, setNewComment] = useState('');
  const [newIssue, setNewIssue] = useState('');

  const handleAddComment = () => {
    if(!newComment.trim()) return;
    const c = { id: Date.now(), author: currentUser.name, text: newComment, date: '2026-04-27' };
    onUpdate({ comments: [...(task.comments || []), c] });
    setNewComment('');
  };

  const handleAddIssue = () => {
    if(!newIssue.trim()) return;
    const i = { id: Date.now(), text: newIssue, author: currentUser.name, date: '2026-04-27', isResolved: false, resolution: '' };
    onUpdate({ issues: [...(task.issues || []), i] });
    setNewIssue('');
  };

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if(!file) return;
    const newF = { id: Date.now(), name: file.name, uploader: currentUser.name, date: '2026-04-27' };
    if(type === 'ref') onUpdate({ attachments: [...(task.attachments || []), newF] });
    else onUpdate({ uploadedFiles: [...(task.uploadedFiles || []), newF] });
  };

  const removeFile = (fId, type) => {
    if(!window.confirm("파일을 삭제하시겠습니까?")) return;
    if(type === 'ref') onUpdate({ attachments: task.attachments.filter(f => f.id !== fId) });
    else onUpdate({ uploadedFiles: task.uploadedFiles.filter(f => f.id !== fId) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-8 py-5 border-b bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_MAP[task.status].color}`}>{STATUS_MAP[task.status].label}</span>
            <h3 className="text-xl font-black text-gray-900">{task.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full shadow-sm text-gray-400 hover:text-gray-900 transition-all"><X size={24} /></button>
        </div>

        <div className="flex border-b bg-white">
          <TabButton active={activeTab === 'info'} label="상세 정보" onClick={() => setActiveTab('info')} />
          <TabButton active={activeTab === 'issues'} label={`이슈 및 해결 (${(task.issues || []).length})`} onClick={() => setActiveTab('issues')} />
          <TabButton active={activeTab === 'comments'} label={`코멘트 (${(task.comments || []).length})`} onClick={() => setActiveTab('comments')} />
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {activeTab === 'info' && (
            <div className="grid grid-cols-3 gap-12">
              <div className="col-span-2 space-y-8">
                <section>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">업무 설명</h4>
                    <button onClick={() => { if(isEditing) onUpdate({description: editDesc}); setIsEditing(!isEditing); }} className="text-xs text-emerald-600 font-bold hover:underline">
                      {isEditing ? '저장하기' : '수정하기'}
                    </button>
                  </div>
                  {isEditing ? (
                    <textarea value={editDesc} onChange={e=>setEditDesc(e.target.value)} className="w-full border-2 border-emerald-100 rounded-xl p-4 text-sm focus:border-emerald-500 outline-none" rows={5} />
                  ) : (
                    <p className="bg-gray-50 p-6 rounded-2xl text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{task.description}</p>
                  )}
                </section>

                <div className="grid grid-cols-2 gap-8">
                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">참고 자료</h4>
                      <label className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md cursor-pointer hover:bg-emerald-200 font-bold">+ 파일 추가 <input type="file" className="hidden" onChange={e=>handleFileUpload(e, 'ref')} /></label>
                    </div>
                    <div className="space-y-2">
                      {task.attachments?.map(f => (
                        <div key={f.id} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all group">
                          <span className="text-xs font-bold text-gray-600 truncate mr-2">{f.name}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={()=>removeFile(f.id, 'ref')} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                          </div>
                        </div>
                      ))}
                      {(!task.attachments || task.attachments.length === 0) && <p className="text-[10px] text-gray-300 text-center py-4 italic">자료 없음</p>}
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">결과물</h4>
                      <label className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-md cursor-pointer hover:bg-blue-200 font-bold">+ 결과 등록 <input type="file" className="hidden" onChange={e=>handleFileUpload(e, 'out')} /></label>
                    </div>
                    <div className="space-y-2">
                      {task.uploadedFiles?.map(f => (
                        <div key={f.id} className="flex justify-between items-center p-3 bg-blue-50/30 border border-blue-100 rounded-xl group">
                          <span className="text-xs font-black text-blue-700 truncate">{f.name}</span>
                          <button onClick={()=>removeFile(f.id, 'out')} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                        </div>
                      ))}
                      {(!task.uploadedFiles || task.uploadedFiles.length === 0) && <p className="text-[10px] text-gray-300 text-center py-4 italic">등록된 결과물 없음</p>}
                    </div>
                  </section>
                </div>
              </div>

              <div className="space-y-8">
                <section>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">상태 제어</h4>
                  <select 
                    className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    value={task.status}
                    onChange={e => onUpdate({status: e.target.value})}
                  >
                    {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </section>

                <section>
                  <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">마감 기한</h4>
                  <input 
                    type="date" 
                    className="w-full border-2 border-gray-100 rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={task.dueDate}
                    onChange={e => onUpdate({dueDate: e.target.value})}
                  />
                </section>

                <section className="p-5 bg-gray-50 rounded-2xl border border-gray-200">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">참여 멤버</h4>
                   <div className="space-y-4">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">담</div>
                       <div><p className="text-xs font-bold text-gray-900">{MOCK_USERS.find(u=>u.id===task.assigneeId)?.name}</p></div>
                     </div>
                   </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex gap-2">
                <input value={newIssue} onChange={e=>setNewIssue(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddIssue()} placeholder="발생한 이슈나 문제 상황을 기록하세요." className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400" />
                <button onClick={handleAddIssue} className="bg-red-500 text-white px-6 rounded-xl font-bold hover:bg-red-600 transition-colors">등록</button>
              </div>
              <div className="space-y-4">
                {(task.issues || []).map(i => (
                  <div key={i.id} className={`p-6 rounded-2xl border ${i.isResolved ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex justify-between mb-4">
                      <span className="font-bold text-red-700 flex items-center gap-2"><AlertTriangle size={16}/> {i.text}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{i.author} | {i.date}</span>
                    </div>
                    {i.isResolved ? (
                      <div className="bg-white p-4 rounded-xl border border-emerald-100 text-sm"><span className="font-black text-emerald-600 mr-2">해결:</span>{i.resolution}</div>
                    ) : (
                      <button onClick={() => {
                        const res = window.prompt("해결 내용을 입력하세요:");
                        if(res) {
                          const upd = task.issues.map(item => item.id === i.id ? { ...item, isResolved: true, resolution: res } : item);
                          onUpdate({ issues: upd });
                        }
                      }} className="text-xs font-black text-red-500 hover:underline">해결 완료로 전환</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="flex gap-2">
                <input value={newComment} onChange={e=>setNewComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddComment()} placeholder="의견을 남겨주세요." className="flex-1 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:border-purple-400" />
                <button onClick={handleAddComment} className="bg-purple-600 text-white px-6 rounded-xl font-bold hover:bg-purple-700 transition-colors">등록</button>
              </div>
              <div className="space-y-4">
                {(task.comments || []).map(c => (
                  <div key={c.id} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs font-black text-purple-700">{c.author}</span>
                      <span className="text-[10px] text-gray-400">{c.date}</span>
                    </div>
                    <p className="text-sm text-gray-800">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t bg-gray-50 flex justify-between items-center">
          <button onClick={onDelete} className="text-red-500 text-sm font-bold flex items-center gap-2 hover:bg-red-100 px-4 py-2 rounded-xl transition-all"><Trash2 size={18}/> 업무 영구 삭제</button>
          <button onClick={onClose} className="bg-gray-900 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:bg-black transition-all">닫기</button>
        </div>
      </div>
    </div>
  );
}

function FilesView({ tasks, projects, onDownload }) {
  const [tab, setTab] = useState('ref'); // ref(참고자료), out(결과물)
  return (
    <div className="space-y-8">
      <div className="flex gap-4 border-b border-gray-200">
        <button onClick={()=>setTab('ref')} className={`pb-4 px-4 text-lg font-black transition-all ${tab==='ref'?'text-emerald-600 border-b-4 border-emerald-600':'text-gray-400'}`}>📎 참고 자료 라이브러리</button>
        <button onClick={()=>setTab('out')} className={`pb-4 px-4 text-lg font-black transition-all ${tab==='out'?'text-blue-600 border-b-4 border-blue-600':'text-gray-400'}`}>🏆 최종 업무 결과물</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.flatMap(t => (tab === 'ref' ? t.attachments : t.uploadedFiles) || []).map((f, idx) => (
          <div key={idx} onClick={()=>onDownload(f.name)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 hover:border-emerald-400 cursor-pointer group">
            <div className={`p-3 rounded-xl ${tab==='ref'?'bg-emerald-50 text-emerald-600':'bg-blue-50 text-blue-600'}`}><FileText size={24}/></div>
            <div className="min-w-0">
              <p className="font-black text-gray-900 truncate group-hover:underline">{f.name}</p>
              <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{f.uploader} | {f.date}</p>
            </div>
          </div>
        ))}
        {tasks.flatMap(t => (tab === 'ref' ? t.attachments : t.uploadedFiles) || []).length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-300 font-bold italic">업로드된 파일이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function TrashView({ trashProjects, trashTasks, onRestore }) {
  return (
    <div className="space-y-12">
      <section>
        <h3 className="text-xl font-black text-slate-400 mb-6 flex items-center gap-2"><Trash2/> 삭제된 프로젝트</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trashProjects.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl border border-red-100 flex justify-between items-center shadow-sm">
              <span className="font-bold text-gray-400 line-through decoration-red-400">{p.name}</span>
              <button onClick={()=>onRestore(p.id, 'project')} className="flex items-center gap-1 text-xs font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100"><RotateCcw size={14}/> 복구하기</button>
            </div>
          ))}
          {trashProjects.length === 0 && <p className="text-sm text-gray-300 italic">휴지통이 비어있습니다.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-black text-slate-400 mb-6 flex items-center gap-2"><ListTodo/> 삭제된 업무</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trashTasks.map(t => (
            <div key={t.id} className="bg-white p-6 rounded-2xl border border-red-50 flex justify-between items-center shadow-sm">
              <span className="font-bold text-gray-400 line-through decoration-red-300">{t.title}</span>
              <button onClick={()=>onRestore(t.id, 'task')} className="flex items-center gap-1 text-xs font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100"><RotateCcw size={14}/> 복구하기</button>
            </div>
          ))}
          {trashTasks.length === 0 && <p className="text-sm text-gray-300 italic">삭제된 업무가 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}

// 📌 유틸리티 컴포넌트들
function TabButton({ active, label, onClick }) {
  return (
    <button onClick={onClick} className={`flex-1 py-4 text-sm font-black transition-all ${active ? 'text-gray-900 border-b-2 border-gray-900 bg-gray-50/50' : 'text-gray-400 hover:text-gray-600'}`}>
      {label}
    </button>
  );
}

function SidebarItem({ icon: Icon, label, active, onClick, badge, badgeColor = "bg-emerald-500" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black transition-all ${
        active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 scale-[1.02]' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3"><Icon size={18} /> {label}</div>
      {badge !== undefined && badge > 0 && <span className={`${badgeColor} text-white text-[10px] px-2 py-0.5 rounded-full`}>{badge}</span>}
    </button>
  );
}

function ProjectCard({ project, tasks, onAddTask, onDelete, onSelectTask }) {
  const pTasks = tasks.filter(t => t.projectId === project.id);
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all">
      <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="text-lg font-black text-gray-900">{project.name}</h3>
        <div className="flex gap-2">
          <button onClick={onAddTask} className="p-2 bg-white text-emerald-600 rounded-xl shadow-sm border border-gray-200 hover:bg-emerald-50 transition-colors"><Plus size={18}/></button>
          <button onClick={onDelete} className="p-2 bg-white text-red-400 rounded-xl shadow-sm border border-gray-200 hover:bg-red-50 transition-colors"><Trash2 size={18}/></button>
        </div>
      </div>
      <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
        {pTasks.map(t => (
          <div key={t.id} onClick={()=>onSelectTask(t)} className="p-4 bg-white border border-gray-100 rounded-2xl hover:border-emerald-300 cursor-pointer shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-gray-800 text-sm">{t.title}</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border ${STATUS_MAP[t.status].color}`}>{STATUS_MAP[t.status].label}</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase">{MOCK_USERS.find(u=>u.id===t.assigneeId)?.name} | {t.dueDate}</p>
          </div>
        ))}
        {pTasks.length === 0 && <p className="text-center py-10 text-gray-300 text-xs italic">업무 없음</p>}
      </div>
    </div>
  );
}

function CalendarView({ tasks, projects, currentDate, setCurrentDate, onTaskClick, onDateClick }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = '2026-04-27';
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells = [];
  const prevMonthEnd = new Date(year, month, 0).getDate();
  for(let i=firstDay-1; i>=0; i--) cells.push({ date: new Date(year, month-1, prevMonthEnd-i), isCur: false });
  for(let i=1; i<=daysInMonth; i++) cells.push({ date: new Date(year, month, i), isCur: true });
  while(cells.length < 42) cells.push({ date: new Date(year, month+1, cells.length - (firstDay+daysInMonth) + 1), isCur: false });

  const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[700px]">
      <div className="p-8 border-b flex justify-between items-center bg-white">
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter">{year}년 {month + 1}월</h2>
        <div className="flex gap-2">
          <button onClick={()=>setCurrentDate(new Date(year, month-1, 1))} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ChevronLeft size={20}/></button>
          <button onClick={()=>setCurrentDate(new Date('2026-04-27'))} className="px-6 py-2 bg-gray-100 rounded-full font-black text-sm hover:bg-gray-200 transition-colors">오늘</button>
          <button onClick={()=>setCurrentDate(new Date(year, month+1, 1))} className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 bg-gray-50 border-b">
        {['일','월','화','수','목','금','토'].map((d,idx) => <div key={d} className={`py-4 text-center text-xs font-black uppercase tracking-widest ${idx===0?'text-red-400':idx===6?'text-blue-400':'text-gray-400'}`}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {cells.map((c, i) => {
          const dStr = formatDate(c.date);
          const isToday = dStr === todayStr;
          const dayTasks = tasks.filter(t => t.dueDate === dStr);
          return (
            <div key={i} className={`border-b border-r border-gray-50 p-2 group transition-all ${c.isCur?'bg-white':'bg-gray-50/50'}`}>
              <div className="flex justify-between items-start mb-2">
                <button onClick={()=>onDateClick(dStr)} className="opacity-0 group-hover:opacity-100 p-1 text-emerald-400 hover:bg-emerald-50 rounded-lg transition-all"><Plus size={14}/></button>
                <span className={`text-xs font-black ${isToday ? 'bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg' : c.isCur ? 'text-gray-900' : 'text-gray-300'}`}>{c.date.getDate()}</span>
              </div>
              <div className="space-y-1 overflow-y-auto max-h-[80px]">
                {dayTasks.map(t => (
                  <div key={t.id} onClick={()=>onTaskClick(t)} className={`text-[10px] p-1.5 rounded-lg border-l-4 truncate shadow-sm font-bold cursor-pointer transition-transform hover:scale-105 ${STATUS_MAP[t.status].color}`}>{t.title}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskListView({ tasks, projects, onSelect, isUrgent }) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-gray-50 border-b text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <tr><th className="px-8 py-5">업무 정보</th><th className="px-8 py-5">담당자</th><th className="px-8 py-5">상태</th><th className="px-8 py-5">마감일</th><th className="px-8 py-5">첨부</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {tasks.map(t => (
            <tr key={t.id} onClick={()=>onSelect(t)} className="hover:bg-emerald-50/30 cursor-pointer transition-all">
              <td className="px-8 py-6">
                <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">{projects.find(p=>p.id===t.projectId)?.name}</p>
                <p className="text-base font-black text-gray-900">{t.title}</p>
                {isUrgent(t.dueDate) && t.status !== 'done' && <span className="inline-block mt-2 bg-red-100 text-red-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">🚨 마감임박</span>}
              </td>
              <td className="px-8 py-6 font-bold text-gray-600">{MOCK_USERS.find(u=>u.id===t.assigneeId)?.name}</td>
              <td className="px-8 py-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black border ${STATUS_MAP[t.status].color}`}>{STATUS_MAP[t.status].label}</span></td>
              <td className="px-8 py-6 font-black text-gray-400">{t.dueDate}</td>
              <td className="px-8 py-6 font-bold text-gray-300">{(t.attachments?.length || 0) + (t.uploadedFiles?.length || 0)}개</td>
            </tr>
          ))}
          {tasks.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-gray-300 italic">업무가 없습니다.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AssigneeStats({ tasks, users, onSelectTask }) {
  const stats = users.map(u => {
    const userTasks = tasks.filter(t => t.assigneeId === u.id);
    return { user: u, total: userTasks.length, done: userTasks.filter(t => t.status === 'done').length, tasks: userTasks };
  }).filter(s => s.total > 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {stats.map(s => (
        <div key={s.user.id} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-lg">{s.user.name[0]}</div>
            <div><h3 className="text-xl font-black text-gray-900">{s.user.name}</h3><p className="text-[10px] font-bold text-gray-400 uppercase">{s.user.dept}</p></div>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-sm font-bold"><span className="text-gray-400">총 업무</span><span className="text-gray-900">{s.total}건</span></div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden"><div className="bg-emerald-500 h-full" style={{width: `${(s.done/s.total)*100}%`}}></div></div>
          </div>
          <div className="space-y-2">
            {s.tasks.map(t => (
              <div key={t.id} onClick={()=>onSelectTask(t)} className="text-[10px] font-black text-gray-500 border border-gray-50 p-2 rounded-lg hover:bg-emerald-50 cursor-pointer truncate">{t.title}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    const u = MOCK_USERS.find(user => user.name === name.trim() && user.pin === pin);
    if(u) onLogin(u); else { setError('이름 또는 비밀번호가 틀립니다.'); setPin(''); }
  };
  return (
    <div className="h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md p-12 space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">(주)케이아그로솔루션즈</h1>
          <p className="text-gray-400 text-xs mt-3 font-bold uppercase tracking-widest">통합 업무 관리 시스템 로그인</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">이름</label>
            <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-center text-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="김은경" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">PIN 번호 (4자리)</label>
            <input required type="password" maxLength={4} value={pin} onChange={e=>setPin(e.target.value.replace(/[^0-9]/g,''))} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold text-center text-lg tracking-[1em] outline-none focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="****" />
          </div>
          {error && <p className="text-red-500 text-xs text-center font-bold">{error}</p>}
          <button type="submit" className="w-full bg-emerald-600 text-white rounded-2xl p-5 font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95">접속하기</button>
        </form>
        <div className="pt-4 grid grid-cols-2 gap-2">
          {MOCK_USERS.map(u => <div key={u.id} className="bg-gray-50 p-2 rounded-xl text-[9px] font-bold text-gray-400 border border-gray-100 text-center">{u.name}: {u.pin}</div>)}
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ projects, activeProjectId, users, currentUser, defaultDate, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(activeProjectId || (projects[0]?.id || ''));
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState(defaultDate);
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!title.trim()) return;
    onAdd({ title, projectId, assigneeId, dueDate, description });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-sm">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl p-10 flex flex-col gap-8">
        <h3 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3"><Plus size={32} className="text-emerald-500"/> 새 업무 등록</h3>
        <form className="space-y-6" onSubmit={handleSubmit}>
           <div className="grid grid-cols-2 gap-6">
             <div className="space-y-2 col-span-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">업무 제목</label>
               <input required value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" placeholder="예: 상반기 실적 보고서 작성" />
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">프로젝트</label>
               <select value={projectId} onChange={e=>setProjectId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                 {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">담당자</label>
               <select value={assigneeId} onChange={e=>setAssigneeId(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                 {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.dept})</option>)}
               </select>
             </div>
             <div className="space-y-2 col-span-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">마감일</label>
               <input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
             </div>
             <div className="space-y-2 col-span-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">세부 내용</label>
               <textarea value={description} onChange={e=>setDescription(e.target.value)} className="w-full bg-gray-50 border-none rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" rows={4} placeholder="업무 상세 지침이나 참고사항을 입력하세요." />
             </div>
           </div>
           <div className="flex gap-4">
             <button type="button" onClick={onClose} className="flex-1 bg-gray-100 text-gray-500 rounded-2xl py-4 font-black hover:bg-gray-200 transition-all">취소</button>
             <button type="submit" className="flex-2 bg-emerald-600 text-white rounded-2xl py-4 font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all">업무 등록 완료</button>
           </div>
        </form>
      </div>
    </div>
  );
}

function getMenuTitle(m) {
  const titles = { calendar: '일정 통합 캘린더', projects: '전체 프로젝트 관리', all: '프로젝트 업무 상세', mine: '내 담당 업무함', urgent: '마감 긴급 업무', revision: '수정 검토 요청', review: '최종 검토 대기', done: '완료 업무 보관함', files: '전체 업로드 자료함', assignees: '멤버별 업무 현황', trash: '시스템 휴지통' };
  return titles[m] || '현황 대시보드';
}