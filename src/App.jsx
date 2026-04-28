import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, ListTodo, User, Users, AlertCircle, 
  FileEdit, ClipboardCheck, CheckCircle2, Files, MessageSquare, 
  BarChart3, PieChart, Search, Filter, MoreVertical, 
  Paperclip, Upload, X, Clock, Calendar, ChevronRight, UserCircle,
  CalendarDays, ChevronLeft, LogOut, Lock, Plus, Trash2, FolderKanban, FolderPlus, Download
} from 'lucide-react';

// --- [회사 실제 데이터] ---
const MOCK_USERS = [
  { id: 'u1', name: '김영곤', role: 'admin', dept: '대표이사', pin: '6070' },
  { id: 'u2', name: '김세진', role: 'manager', dept: '본부장', pin: '4680' },
  { id: 'u3', name: '김은경', role: 'manager', dept: '팀장', pin: '7026' },
  { id: 'u4', name: '고경석', role: 'employee', dept: '사원', pin: '7026' }, 
  { id: 'u5', name: '강혜주', role: 'employee', dept: '사원', pin: '3186' },
];

const INITIAL_PROJECTS = [
  { id: 'p1', name: '2026 상반기 투자설명회' },
  { id: 'p2', name: '하반기 신제품 런칭 캠페인' },
  { id: 'p3', name: '사내 보안 솔루션 도입' }
];

const INITIAL_TASKS = [
  {
    id: 't1',
    projectId: 'p1',
    title: '투자설명회 기획안 작성',
    description: '상반기 투자설명회 진행을 위한 전반적인 기획안 작성 및 일정 수립',
    assigneeId: 'u3', 
    collaborators: ['u5'], 
    dueDate: '2026-05-15',
    status: 'in_progress',
    attachments: [],
    uploadedFiles: [],
    comments: [],
    reviewStatus: 'none'
  }
];

const STATUS_MAP = {
  'todo': { label: '시작 전', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  'in_progress': { label: '진행 중', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'review': { label: '검토 대기', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'revision': { label: '수정 요청', color: 'bg-red-100 text-red-700 border-red-200' },
  'done': { label: '완료', color: 'bg-green-100 text-green-700 border-green-200' },
};

// --- [Components] ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('agro_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('agro_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  useEffect(() => { localStorage.setItem('agro_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('agro_tasks', JSON.stringify(tasks)); }, [tasks]);

  if (!isLoggedIn) return <LoginScreen onLogin={(user) => { setCurrentUser(user); setIsLoggedIn(true); }} />;

  return <Dashboard currentUser={currentUser} onLogout={() => setIsLoggedIn(false)} projects={projects} setProjects={setProjects} tasks={tasks} setTasks={setTasks} />;
}

function Dashboard({ currentUser, onLogout, projects, setProjects, tasks, setTasks }) {
  const [activeProject, setActiveProject] = useState(projects.length > 0 ? projects[0].id : '');
  const [activeMenu, setActiveMenu] = useState('calendar');
  const [selectedTask, setSelectedTask] = useState(null);
  
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskDefaultDate, setNewTaskDefaultDate] = useState('');
  const [newTaskDefaultProject, setNewTaskDefaultProject] = useState('');
  
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadTargetProject, setUploadTargetProject] = useState('');

  const [calendarDate, setCalendarDate] = useState(new Date('2026-04-27'));
  const TODAY = new Date('2026-04-27');

  const isUrgent = (dateString) => {
    const due = new Date(dateString);
    const diffTime = due - TODAY;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3; 
  };

  const projectTasks = useMemo(() => tasks.filter(t => t.projectId === activeProject), [tasks, activeProject]);

  const filteredTasks = useMemo(() => {
    switch (activeMenu) {
      case 'all': return projectTasks;
      case 'mine': return projectTasks.filter(t => t.assigneeId === currentUser.id);
      case 'others': return projectTasks.filter(t => t.assigneeId !== currentUser.id);
      case 'urgent': return projectTasks.filter(t => isUrgent(t.dueDate) && t.status !== 'done');
      case 'revision': return projectTasks.filter(t => t.status === 'revision');
      case 'review': return projectTasks.filter(t => t.status === 'review');
      case 'done': return projectTasks.filter(t => t.status === 'done');
      default: return projectTasks;
    }
  }, [projectTasks, activeMenu, currentUser.id]);

  const allComments = projectTasks.flatMap(t => t.comments?.map(c => ({ ...c, taskTitle: t.title, taskId: t.id })) || []);
  
  const assigneeStats = MOCK_USERS.map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id); 
    return {
      user,
      total: userTasks.length,
      done: userTasks.filter(t => t.status === 'done').length,
      pending: userTasks.filter(t => t.status !== 'done').length
    };
  }).filter(stat => stat.total > 0);

  const handleStatusChange = (taskId, newStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  const handleFileUploadMock = (taskId) => {
    const newFile = { name: `첨부문서_${Date.now().toString().slice(-4)}.pdf`, uploader: currentUser.name, date: '2026-04-27' };
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) return { ...t, uploadedFiles: [...(t.uploadedFiles || []), newFile] };
      return t;
    });
    setTasks(updatedTasks);
    if (selectedTask && selectedTask.id === taskId) setSelectedTask(updatedTasks.find(t => t.id === taskId));
    alert('임시 파일이 업로드 되었습니다.');
  };

  const handleUploadFileFromMenu = (taskId, fileName) => {
    const newFile = { name: fileName, uploader: currentUser.name, date: '2026-04-27' };
    setTasks(tasks.map(t => t.id === taskId ? { ...t, uploadedFiles: [...(t.uploadedFiles || []), newFile] } : t));
    setIsUploadingFile(false);
    alert(`[${fileName}] 자료가 성공적으로 등록되었습니다!`);
  };

  // 📌 새 기능: 가짜 다운로드 액션 처리
  const handleFileDownload = (fileName) => {
    alert(`[${fileName}] 다운로드는 실제 서버(DB) 연동 후 지원됩니다.\n(현재는 기능 시연용 프로토타입 버전입니다.)`);
  };

  const handleAddTask = (newTaskData) => {
    const newTask = {
      id: 't' + Date.now(),
      ...newTaskData,
      status: 'todo',
      attachments: [],
      uploadedFiles: [],
      comments: [],
      collaborators: [],
      reviewStatus: 'none'
    };
    setTasks([...tasks, newTask]);
    setIsAddingTask(false);
  };

  const handleDeleteTask = (taskId) => {
    if(window.confirm('정말로 이 일정을 삭제하시겠습니까?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
      setSelectedTask(null);
    }
  };

  const handleCreateProject = () => {
    const projectName = window.prompt('새로 생성할 프로젝트 이름을 입력하세요:');
    if (projectName && projectName.trim()) {
      const newProj = { id: 'p' + Date.now(), name: projectName.trim() };
      setProjects([...projects, newProj]);
      setActiveProject(newProj.id);
    }
  };

  const handleDeleteProject = (projectId) => {
    if(window.confirm('🚨 경고: 프로젝트를 삭제하면 해당 프로젝트에 속한 "모든 업무"도 함께 영구 삭제됩니다.\n정말 삭제하시겠습니까?')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      setProjects(updatedProjects);
      setTasks(tasks.filter(t => t.projectId !== projectId));
      if (activeProject === projectId) setActiveProject(updatedProjects.length > 0 ? updatedProjects[0].id : '');
    }
  };

  const canEditTask = (task) => currentUser.role === 'admin' || currentUser.id === task.assigneeId;
  const canManageTask = () => currentUser.role === 'admin' || currentUser.role === 'manager';

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 bg-slate-950">
          <h1 className="text-emerald-500 font-extrabold text-xl flex items-center justify-center gap-2 mb-6 tracking-tight">
            (주)케이아그로솔루션즈
          </h1>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">현재 열람중인 프로젝트</label>
            <select 
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              value={activeProject}
              onChange={(e) => {
                setActiveProject(e.target.value);
                if (activeMenu !== 'calendar' && activeMenu !== 'projects') setActiveMenu('all'); 
              }}
            >
              {projects.length > 0 ? projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              )) : (
                <option value="">프로젝트 없음</option>
              )}
            </select>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            <div className="pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">메인 메뉴</p>
            </div>
            <SidebarItem icon={CalendarDays} label="통합 캘린더 뷰" active={activeMenu === 'calendar'} onClick={() => setActiveMenu('calendar')} />
            <SidebarItem icon={FolderKanban} label="프로젝트 관리" active={activeMenu === 'projects'} onClick={() => setActiveMenu('projects')} />
            <SidebarItem icon={ListTodo} label="선택 프로젝트 업무" active={activeMenu === 'all'} onClick={() => setActiveMenu('all')} />
            
            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">업무 필터</p>
            </div>
            <SidebarItem icon={User} label="내가 담당한 업무" active={activeMenu === 'mine'} onClick={() => setActiveMenu('mine')} />
            <SidebarItem icon={AlertCircle} label="마감 임박 업무" active={activeMenu === 'urgent'} onClick={() => setActiveMenu('urgent')} badge={projectTasks.filter(t=>isUrgent(t.dueDate)&&t.status!=='done').length} badgeColor="bg-red-500" />
            <SidebarItem icon={FileEdit} label="수정 요청된 업무" active={activeMenu === 'revision'} onClick={() => setActiveMenu('revision')} badge={projectTasks.filter(t=>t.status==='revision').length} badgeColor="bg-orange-500" />
            <SidebarItem icon={ClipboardCheck} label="검토 대기 중인 업무" active={activeMenu === 'review'} onClick={() => setActiveMenu('review')} badge={projectTasks.filter(t=>t.status==='review').length} badgeColor="bg-purple-500" />
            <SidebarItem icon={CheckCircle2} label="완료된 업무" active={activeMenu === 'done'} onClick={() => setActiveMenu('done')} />

            <div className="pt-4 pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">현황 리포트</p>
            </div>
            <SidebarItem icon={Files} label="전체 업로드 자료" active={activeMenu === 'files'} onClick={() => setActiveMenu('files')} />
            <SidebarItem icon={MessageSquare} label="코멘트 내역" active={activeMenu === 'comments'} onClick={() => setActiveMenu('comments')} />
            <SidebarItem icon={PieChart} label="담당자별 현황" active={activeMenu === 'assignees'} onClick={() => setActiveMenu('assignees')} />
          </nav>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {getMenuTitle(activeMenu)}
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {['files', 'comments', 'assignees', 'calendar', 'projects'].includes(activeMenu) ? '' : `${filteredTasks.length}건`}
            </span>
          </h2>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if(projects.length === 0) return alert('먼저 좌측 프로젝트 관리 메뉴에서 프로젝트를 생성해주세요.');
                setNewTaskDefaultDate('');
                setNewTaskDefaultProject(activeProject || projects[0]?.id);
                setIsAddingTask(true);
              }}
              className="flex items-center gap-1 bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus size={18} /> 새 일정 추가
            </button>
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
              <UserCircle size={20} className="text-gray-500" />
              <div className="text-sm">
                <span className="font-bold text-emerald-700 mr-1">{currentUser.name}</span>
                <span className="text-gray-500 text-xs">({currentUser.dept})</span>
              </div>
            </div>
            <button onClick={onLogout} className="text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 font-bold transition-colors">
              <LogOut size={18} /> 로그아웃
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-gray-50 flex flex-col">
          
          {activeMenu === 'projects' && (
            <div>
              {canManageTask() && (
                <div className="flex justify-end mb-6">
                  <button 
                    onClick={handleCreateProject}
                    className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <FolderPlus size={18} /> 새 프로젝트 만들기
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {projects.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    생성된 프로젝트가 없습니다. 우측 상단의 버튼을 눌러 프로젝트를 추가해주세요.
                  </div>
                ) : (
                  projects.map(project => {
                    const projTasks = tasks.filter(t => t.projectId === project.id);
                    return (
                      <div key={project.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden group">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {project.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setNewTaskDefaultDate('');
                                setNewTaskDefaultProject(project.id);
                                setIsAddingTask(true);
                              }}
                              className="text-sm flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                            >
                              <Plus size={16}/> 세부 업무 추가
                            </button>
                            
                            {canManageTask() && (
                              <button
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-sm flex items-center gap-1 bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-md font-bold hover:bg-red-50 hover:border-red-300 transition-colors"
                              >
                                <Trash2 size={16}/> 삭제
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="p-6 space-y-3 max-h-96 overflow-y-auto">
                          {projTasks.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-6">등록된 세부 업무가 없습니다.</p>
                          ) : (
                            projTasks.map(t => (
                              <div 
                                key={t.id} 
                                onClick={() => setSelectedTask(t)} 
                                className="flex items-center justify-between p-4 bg-white border border-gray-100 hover:border-emerald-300 hover:shadow-md rounded-xl cursor-pointer transition-all"
                              >
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="font-bold text-gray-800 truncate">{t.title}</span>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                                    <span>담당: {MOCK_USERS.find(u=>u.id===t.assigneeId)?.name}</span>
                                    <span>|</span>
                                    <span className={isUrgent(t.dueDate) && t.status !== 'done' ? 'text-red-500 font-bold' : ''}>{t.dueDate}</span>
                                  </div>
                                </div>
                                <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[t.status].color}`}>
                                  {STATUS_MAP[t.status].label}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeMenu === 'calendar' && (
            <CalendarView 
              tasks={tasks} 
              projects={projects}
              currentDate={calendarDate} 
              setCurrentDate={setCalendarDate}
              onTaskClick={setSelectedTask}
              onDateClick={(dateStr) => {
                if(projects.length === 0) return alert('먼저 프로젝트 관리에서 프로젝트를 생성해주세요.');
                setNewTaskDefaultDate(dateStr);
                setNewTaskDefaultProject(activeProject || projects[0]?.id);
                setIsAddingTask(true);
              }}
            />
          )}

          {activeMenu === 'files' && (
            <div className="space-y-6">
              {projects.map(project => {
                const pTasks = tasks.filter(t => t.projectId === project.id);
                const pFiles = pTasks.flatMap(t => (t.uploadedFiles || []).map(f => ({ ...f, taskTitle: t.title, taskId: t.id })));
                
                return (
                  <div key={project.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {project.name}
                        <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{pFiles.length}건</span>
                      </h3>
                      <button
                        onClick={() => { setUploadTargetProject(project.id); setIsUploadingFile(true); }}
                        className="text-sm flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                      >
                        <Upload size={16}/> 자료 직접 업로드
                      </button>
                    </div>

                    {pFiles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pFiles.map((file, idx) => (
                          <div 
                            key={idx} 
                            className="bg-gray-50 p-5 rounded-xl border border-gray-200 flex items-start gap-4 hover:border-emerald-400 transition-colors cursor-pointer group"
                            onClick={() => handleFileDownload(file.name)}
                          >
                            <div className="p-3 bg-white shadow-sm rounded text-emerald-600"><Files size={28} /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate group-hover:underline group-hover:text-emerald-700 transition-colors">{file.name}</p>
                              <p className="text-xs text-gray-500 mt-1 truncate">연관: {file.taskTitle}</p>
                              <div className="flex justify-between items-center mt-3 text-xs font-medium text-gray-400">
                                <span>{file.uploader} | {file.date}</span>
                                <Download size={14} className="opacity-0 group-hover:opacity-100 text-emerald-600 transition-opacity" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">업로드된 자료가 없습니다. 우측 상단의 업로드 버튼을 눌러주세요.</p>
                    )}
                  </div>
                );
              })}
              {projects.length === 0 && <div className="text-center py-20 text-gray-500">프로젝트가 없습니다.</div>}
            </div>
          )}

          {activeMenu === 'comments' && (
            <div className="space-y-4 max-w-4xl">
              {allComments.map((comment, idx) => (
                <div key={idx} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="font-bold text-gray-900 mr-2">{comment.author}</span>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{comment.role === 'manager' ? '팀장/본부장' : '관리자'}</span>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{comment.date}</span>
                  </div>
                  <p className="text-gray-700">{comment.text}</p>
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-blue-600 font-medium"
                       onClick={() => setSelectedTask(tasks.find(t => t.id === comment.taskId))}>
                    <ListTodo size={16} /> 해당 업무: {comment.taskTitle} <ChevronRight size={16} />
                  </div>
                </div>
              ))}
               {allComments.length === 0 && <p className="text-center py-20 text-gray-500">등록된 코멘트가 없습니다.</p>}
            </div>
          )}

          {activeMenu === 'assignees' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assigneeStats.map((stat, idx) => (
                <div 
                  key={idx} 
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:border-emerald-400 hover:shadow-md transition-all group relative"
                  onClick={() => setSelectedAssigneeId(stat.user.id)}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {stat.user.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{stat.user.name}</h3>
                      <p className="text-sm text-gray-500">{stat.user.dept}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">총 할당 업무</span>
                      <span className="font-bold">{stat.total}건</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">진행/대기 중</span>
                      <span className="font-bold text-blue-600">{stat.pending}건</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">완료</span>
                      <span className="font-bold text-green-600">{stat.done}건</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mt-3">
                      <div className="bg-emerald-500 h-2.5 rounded-full transition-all" style={{ width: `${(stat.done / stat.total) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-100 text-center text-xs text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex justify-center items-center gap-1">
                    <Search size={14}/> 클릭하여 상세 진행 업무 보기
                  </div>
                </div>
              ))}
              {assigneeStats.length === 0 && <p className="text-gray-500 col-span-full text-center py-20">진행 중인 업무가 없습니다.</p>}
            </div>
          )}

          {!['files', 'comments', 'assignees', 'calendar', 'projects'].includes(activeMenu) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                  <tr>
                    <th className="px-6 py-4">업무명</th>
                    <th className="px-6 py-4">담당자</th>
                    <th className="px-6 py-4">진행상태</th>
                    <th className="px-6 py-4">마감일</th>
                    <th className="px-6 py-4">첨부/자료</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTasks.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-16 text-center text-gray-500 font-medium">해당 조건의 업무가 없습니다.</td></tr>
                  ) : (
                    filteredTasks.map(task => {
                      const assignee = MOCK_USERS.find(u => u.id === task.assigneeId);
                      const statusInfo = STATUS_MAP[task.status];
                      const urgent = isUrgent(task.dueDate) && task.status !== 'done';
                      
                      return (
                        <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-emerald-50 cursor-pointer transition-colors">
                          <td className="px-6 py-5">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setActiveProject(task.projectId); setActiveMenu('all'); }}
                              className="inline-block mb-1.5 px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-500 rounded hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
                            >
                              {projects.find(p => p.id === task.projectId)?.name || '삭제된 프로젝트'}
                            </div>
                            <div className="font-bold text-gray-900 text-base">{task.title}</div>
                            {urgent && <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1.5 bg-red-50 px-2 py-0.5 rounded-full font-bold"><Clock size={14}/> 마감임박</span>}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">{assignee?.name.charAt(0)}</div>
                              <span className="text-gray-700 font-medium">{assignee?.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${statusInfo.color}`}>{statusInfo.label}</span>
                          </td>
                          <td className="px-6 py-5 text-gray-600 font-medium">{task.dueDate}</td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4 text-gray-500 font-medium">
                              <span className="flex items-center gap-1"><Paperclip size={16}/> {(task.attachments || []).length}</span>
                              <span className="flex items-center gap-1"><Files size={16}/> {(task.uploadedFiles || []).length}</span>
                              {(task.comments || []).length > 0 && <span className="flex items-center gap-1 text-emerald-500"><MessageSquare size={16}/> {task.comments.length}</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </main>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-[50] flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <span 
                  className="text-sm bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-md cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 transition-colors shadow-sm"
                  onClick={() => { setActiveProject(selectedTask.projectId); setSelectedTask(null); setActiveMenu('all'); }}
                >
                  {projects.find(p => p.id === selectedTask.projectId)?.name || '삭제된 프로젝트'}
                </span>
                {selectedTask.title}
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_MAP[selectedTask.status].color}`}>
                  {STATUS_MAP[selectedTask.status].label}
                </span>
              </h3>
              <button onClick={() => setSelectedTask(null)} className="text-gray-400 hover:text-gray-900 bg-white rounded-full p-1 shadow-sm"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 text-sm text-gray-700 space-y-8">
              <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-6">
                  <div>
                    <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-2">업무 상세 내용</h4>
                    <p className="bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed font-medium text-gray-800">{selectedTask.description}</p>
                  </div>
                  
                  <div className="flex gap-8">
                    <div>
                      <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-2">담당자</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          {MOCK_USERS.find(u => u.id === selectedTask.assigneeId)?.name.charAt(0)}
                        </div>
                        <span className="font-bold text-base">{MOCK_USERS.find(u => u.id === selectedTask.assigneeId)?.name}</span>
                      </div>
                    </div>
                    {selectedTask.collaborators && selectedTask.collaborators.length > 0 && (
                      <div>
                        <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-2">협업자</h4>
                        <div className="flex items-center gap-2 mt-1">
                           {selectedTask.collaborators.map(cId => (
                             <span key={cId} className="bg-gray-100 px-3 py-1.5 rounded-md text-sm font-medium text-gray-700">
                               {MOCK_USERS.find(u => u.id === cId)?.name}
                             </span>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50/50 p-5 rounded-xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-900 flex items-center gap-2 mb-3"><Calendar size={18}/> 마감일</h4>
                    <p className={`text-lg font-bold ${isUrgent(selectedTask.dueDate) && selectedTask.status !== 'done' ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedTask.dueDate} 
                      {isUrgent(selectedTask.dueDate) && selectedTask.status !== 'done' && <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full align-middle">임박</span>}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-400 text-xs uppercase tracking-widest mb-2">상태 변경</h4>
                    {canEditTask(selectedTask) ? (
                      <select 
                        className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-700 bg-white cursor-pointer"
                        value={selectedTask.status}
                        onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                      >
                        {Object.entries(STATUS_MAP).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div className={`w-full border-2 rounded-xl p-3 text-sm font-bold text-center ${STATUS_MAP[selectedTask.status].color}`}>
                        {STATUS_MAP[selectedTask.status].label}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100" />

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2"><Paperclip size={18}/> 참고 자료</h4>
                  {selectedTask.attachments && selectedTask.attachments.length > 0 ? (
                    <ul className="space-y-2">
                      {selectedTask.attachments.map((file, i) => (
                        <li key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-300 cursor-pointer group" onClick={() => handleFileDownload(file.name)}>
                          <div className="flex items-center gap-3">
                            <Files size={18} className="text-gray-400 group-hover:text-emerald-600" />
                            <span className="font-medium text-gray-700 group-hover:text-emerald-700 group-hover:underline">{file.name}</span>
                          </div>
                          <Download size={16} className="text-gray-400 opacity-0 group-hover:opacity-100" />
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 font-medium bg-gray-50 p-4 rounded-xl text-center border border-dashed">첨부된 자료가 없습니다.</p>}
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-900 text-base flex items-center gap-2"><Upload size={18}/> 결과물 등록</h4>
                    {canEditTask(selectedTask) && (
                      <button onClick={() => handleFileUploadMock(selectedTask.id)} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-200 font-bold transition-colors">
                        + 임시 업로드
                      </button>
                    )}
                  </div>
                  {selectedTask.uploadedFiles && selectedTask.uploadedFiles.length > 0 ? (
                    <ul className="space-y-3">
                      {selectedTask.uploadedFiles.map((file, i) => (
                        <li key={i} className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm flex justify-between items-center group cursor-pointer hover:border-emerald-400 transition-colors" onClick={() => handleFileDownload(file.name)}>
                          <span className="font-bold text-emerald-700 group-hover:underline">{file.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 font-medium">{file.uploader} | {file.date}</span>
                            <Download size={16} className="text-emerald-600 opacity-0 group-hover:opacity-100" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-gray-400 font-medium bg-gray-50 p-4 rounded-xl text-center border border-dashed">업로드된 결과물이 없습니다.</p>}
                </div>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h4 className="font-bold text-gray-900 text-base mb-4 flex items-center gap-2"><MessageSquare size={18}/> 검토 코멘트</h4>
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  <div className="space-y-4">
                    {selectedTask.comments.map(comment => (
                      <div key={comment.id} className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex justify-between mb-2">
                          <span className="font-bold text-gray-900 text-sm">{comment.author}</span>
                          <span className="text-xs text-gray-500 font-medium">{comment.date}</span>
                        </div>
                        <p className="text-gray-800">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 font-medium bg-gray-50 p-4 rounded-xl text-center border border-dashed">등록된 코멘트가 없습니다.</p>
                )}
              </div>
            </div>

            <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div className="text-sm font-medium text-gray-500">
                {canManageTask() ? '관리자/팀장 권한으로 모든 제어가 가능합니다.' : '일반 직원은 본인 업무만 수정할 수 있습니다.'}
              </div>
              <div className="flex gap-3">
                {(canManageTask() || currentUser.id === selectedTask.assigneeId) && (
                  <button onClick={() => handleDeleteTask(selectedTask.id)} className="px-5 py-2.5 text-sm text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm">
                    <Trash2 size={18}/> 업무 삭제
                  </button>
                )}
                <button onClick={() => setSelectedTask(null)} className="px-8 py-2.5 text-sm bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm">닫기</button>
              </div>
            </div>

          </div>
        </div>
      )}

      {selectedAssigneeId && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <User size={20} className="text-emerald-600" />
                {MOCK_USERS.find(u => u.id === selectedAssigneeId)?.name} 님의 담당 업무 목록
              </h3>
              <button onClick={() => setSelectedAssigneeId(null)} className="text-gray-400 hover:text-gray-900"><X size={24}/></button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 bg-gray-50">
              {tasks.filter(t => t.assigneeId === selectedAssigneeId).length === 0 ? (
                <p className="text-gray-500 text-center py-10 font-medium border border-dashed border-gray-300 rounded-xl">담당 중인 업무가 없습니다.</p>
              ) : tasks.filter(t => t.assigneeId === selectedAssigneeId).map(t => (
                <div key={t.id} onClick={() => { setSelectedAssigneeId(null); setSelectedTask(t); }} className="p-5 border border-gray-200 rounded-xl hover:border-emerald-400 hover:shadow-md bg-white cursor-pointer transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      [{projects.find(p => p.id === t.projectId)?.name || '삭제된 프로젝트'}]
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-bold border ${STATUS_MAP[t.status].color}`}>
                      {STATUS_MAP[t.status].label}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-base">{t.title}</h4>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                    <p className={`text-xs font-bold ${isUrgent(t.dueDate) && t.status !== 'done' ? 'text-red-500' : 'text-gray-500'}`}>
                      마감일: {t.dueDate}
                    </p>
                    <span className="text-xs text-emerald-600 font-bold hover:underline">자세히 보기</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end">
              <button onClick={() => setSelectedAssigneeId(null)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-bold hover:bg-gray-200">닫기</button>
            </div>
          </div>
        </div>
      )}

      {isAddingTask && (
        <AddTaskModal projects={projects} users={MOCK_USERS} currentUser={currentUser} defaultDate={newTaskDefaultDate} defaultProjectId={newTaskDefaultProject} onClose={() => setIsAddingTask(false)} onAdd={handleAddTask} />
      )}

      {isUploadingFile && (
        <UploadFileModal projectId={uploadTargetProject} projects={projects} tasks={tasks} onClose={() => setIsUploadingFile(false)} onUpload={handleUploadFileFromMenu} />
      )}
    </div>
  );
}

function UploadFileModal({ projectId, projects, tasks, onClose, onUpload }) {
  const projTasks = tasks.filter(t => t.projectId === projectId);
  const [taskId, setTaskId] = useState(projTasks.length > 0 ? projTasks[0].id : '');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskId) return alert('해당 프로젝트에 만들어진 세부 업무가 없습니다. 먼저 [프로젝트 관리]에서 업무를 추가해주세요.');
    if (!selectedFile) return alert('업로드할 파일을 선택해주세요.');
    onUpload(taskId, selectedFile.name);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <Upload size={20} className="text-emerald-600" /> 자료 직접 업로드
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={24}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">어떤 업무에 자료를 올릴까요?</label>
            <select required value={taskId} onChange={e=>setTaskId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-gray-700 bg-gray-50 cursor-pointer">
              {projTasks.length > 0 ? projTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>) : <option value="">등록된 세부 업무 없음</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">파일 선택</label>
            <input 
              required 
              type="file" 
              accept=".pdf,.doc,.docx,.html,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg" 
              onChange={e=>setSelectedFile(e.target.files[0])} 
              className="w-full border-2 border-gray-200 rounded-xl p-2 focus:ring-2 focus:ring-emerald-500 outline-none font-medium file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer text-gray-600" 
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">취소</button>
            <button type="submit" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-md">업로드</button>
          </div>
        </form>
      </div>
    </div>
  );
}


function SidebarItem({ icon: Icon, label, active, onClick, badge, badgeColor = "bg-emerald-500" }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        active ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={active ? 'text-white' : 'text-slate-400'} />
        {label}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`${badgeColor} text-white text-[11px] font-bold px-2 py-0.5 rounded-full`}>
          {badge}
        </span>
      )}
    </button>
  );
}

function getMenuTitle(menu) {
  const titles = {
    calendar: '통합 업무 캘린더', projects: '프로젝트 관리', all: '전체 업무 목록', mine: '내가 담당한 업무', others: '다른 직원이 담당한 업무',
    urgent: '마감 임박 업무', revision: '수정 요청된 업무', review: '검토 대기 중인 업무', done: '완료된 업무',
    files: '전체 업로드 자료', comments: '코멘트 현황', assignees: '담당자별 업무 현황'
  };
  return titles[menu] || '업무 현황';
}

function CalendarView({ tasks, projects, currentDate, setCurrentDate, onTaskClick, onDateClick }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const todayStr = '2026-04-27'; 

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const prevMonthDays = new Date(year, month, 0).getDate();
  
  const calendarCells = [];
  
  for (let i = firstDayOfMonth - 1; i >= 0; i--) calendarCells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false });
  for (let i = 1; i <= daysInMonth; i++) calendarCells.push({ date: new Date(year, month, i), isCurrentMonth: true });
  
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) calendarCells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });

  const getFormattedDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const STATUS_STYLES = {
    'todo': 'bg-gray-100 text-gray-700 border-l-4 border-gray-400',
    'in_progress': 'bg-blue-50 text-blue-700 border-l-4 border-blue-500',
    'review': 'bg-purple-50 text-purple-700 border-l-4 border-purple-500',
    'revision': 'bg-red-50 text-red-700 border-l-4 border-red-500',
    'done': 'bg-green-50 text-green-700 border-l-4 border-green-500',
  };

  return (
    <div className="flex flex-col min-h-[800px] h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 bg-white">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">{year}년 {month + 1}월</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronLeft size={24} /></button>
          <button onClick={() => setCurrentDate(new Date('2026-04-27'))} className="px-5 py-2 hover:bg-gray-100 rounded-full border border-gray-200 text-sm font-bold text-gray-700 transition-colors">오늘</button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ChevronRight size={24} /></button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
        {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
          <div key={day} className={`py-4 text-center text-sm font-bold uppercase tracking-widest ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-500'}`}>{day}</div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(140px,_1fr)]">
        {calendarCells.map((cell, idx) => {
          const dateStr = getFormattedDate(cell.date);
          const isToday = dateStr === todayStr;
          const cellTasks = tasks.filter(t => t.dueDate === dateStr);
          const isFirstDayOfMonth = cell.date.getDate() === 1;
          const displayDate = (isFirstDayOfMonth || idx === 0) ? `${cell.date.getMonth() + 1}월 ${cell.date.getDate()}일` : `${cell.date.getDate()}일`;

          return (
            <div key={idx} className={`border-b border-r border-gray-100 p-3 flex flex-col group transition-colors ${cell.isCurrentMonth ? 'bg-white hover:bg-gray-50/30' : 'bg-gray-50/50'} ${idx % 7 === 6 ? 'border-r-0' : ''} ${idx >= 35 ? 'border-b-0' : ''}`}>
              <div className="flex justify-between items-start mb-2">
                <button
                  onClick={() => onDateClick(dateStr)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                  title="이 날짜에 일정 추가"
                >
                  <Plus size={18} />
                </button>
                <span className={`inline-flex items-center justify-center text-sm font-bold ${isToday ? 'w-9 h-9 rounded-full bg-emerald-600 text-white shadow-md' : !cell.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}>
                  {displayDate}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
                {cellTasks.map(task => (
                  <div key={task.id} onClick={() => onTaskClick(task)} className={`text-xs p-2 rounded-lg cursor-pointer truncate shadow-sm transition-transform hover:scale-[1.02] border-l-4 ${STATUS_STYLES[task.status]}`} title={task.title}>
                    <span className="font-extrabold mr-1.5 text-[10px] opacity-60">[{projects.find(p => p.id === task.projectId)?.name?.slice(0, 4) || '삭제'}..]</span>
                    <span className="font-semibold">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setErrorMsg('이름을 입력해주세요.'); return; }
    if (!pin) { setErrorMsg('비밀번호를 입력해주세요.'); return; }
    const user = MOCK_USERS.find(u => u.name === name.trim() && u.pin === pin);
    if (user) { setErrorMsg(''); onLogin(user); } 
    else { setErrorMsg('이름 또는 비밀번호가 일치하지 않습니다.'); setPin(''); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 tracking-tight">(주)케이아그로솔루션즈</h2>
        <p className="mt-3 text-center text-sm text-gray-500 font-medium">통합 업무 관리 시스템 로그인</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-8 shadow-xl sm:rounded-2xl border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 mb-2"><User size={18}/>직원 이름</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김은경" className="block w-full px-4 py-3.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center font-bold text-lg transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 mb-2"><Lock size={18}/>비밀번호 (4자리)</label>
              <input type="password" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} placeholder="****" className="block w-full px-4 py-3.5 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center tracking-[0.5em] font-bold text-xl transition-all" />
              {errorMsg && <p className="mt-3 text-sm text-red-600 text-center font-bold bg-red-50 py-2 rounded-lg">{errorMsg}</p>}
            </div>
            <div className="pt-2">
              <button type="submit" className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all active:scale-[0.98]">
                시스템 접속하기
              </button>
            </div>
            <div className="mt-6 bg-gray-50 p-4 rounded-xl text-xs text-gray-500 border border-gray-200">
              <p className="font-extrabold mb-2 text-gray-700">※ 시스템 테스트 계정 안내</p>
              <ul className="grid grid-cols-2 gap-2 font-medium">
                {MOCK_USERS.map(u => <li key={u.id} className="bg-white px-2 py-1 rounded border border-gray-100">{u.name}({u.dept}): <span className="font-bold text-gray-800">{u.pin}</span></li>)}
              </ul>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ projects, users, currentUser, defaultDate, defaultProjectId, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || (projects.length > 0 ? projects[0].id : ''));
  const [assigneeId, setAssigneeId] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState(defaultDate || '');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !projectId || !assigneeId || !dueDate) return;
    onAdd({ title, projectId, assigneeId, dueDate, description });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        <div className="px-8 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
            <Plus size={24} className="text-emerald-600" /> 새 일정(업무) 추가
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 bg-white rounded-full p-1 shadow-sm"><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">업무명 <span className="text-red-500">*</span></label>
            <input required type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium transition-all" placeholder="예) 현장 답사 및 계약 진행" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">소속 프로젝트 <span className="text-red-500">*</span></label>
              <select required value={projectId} onChange={e=>setProjectId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-700 bg-white cursor-pointer transition-all">
                {projects.length > 0 ? projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : <option value="">생성된 프로젝트가 없습니다</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">담당자 <span className="text-red-500">*</span></label>
              <select required value={assigneeId} onChange={e=>setAssigneeId(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-700 bg-white cursor-pointer transition-all">
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.dept})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">마감일(일정) <span className="text-red-500">*</span></label>
            <input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-bold text-gray-700 transition-all cursor-pointer" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">상세 설명</label>
            <textarea rows={4} value={description} onChange={e=>setDescription(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-medium transition-all" placeholder="업무 내용에 대한 상세한 설명을 적어주세요."></textarea>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-3 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
            <button type="submit" className="px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg">추가하기</button>
          </div>
        </form>
      </div>
    </div>
  );
}