import React, { Suspense, lazy } from 'react';
import { Target } from 'lucide-react';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const Estatisticas = lazy(() => import('../pages/Estatisticas'));
const Planejamento = lazy(() => import('../pages/Planejamento'));
const Assinatura = lazy(() => import('../pages/Assinatura'));
const BemEstar = lazy(() => import('../pages/BemEstar'));
const Aplicativos = lazy(() => import('../pages/Aplicativos'));
const ConvideGanhe = lazy(() => import('../pages/ConvideGanhe'));
const Perfil = lazy(() => import('../pages/Perfil'));
const Comunidades = lazy(() => import('../pages/Comunidades'));
const Esquadroes = lazy(() => import('../pages/Esquadroes'));
const Conciliador = lazy(() => import('../pages/Conciliador'));
const Redacoes = lazy(() => import('../pages/Redacoes'));
const Audiobooks = lazy(() => import('../pages/Audiobooks'));
const MapasMentais = lazy(() => import('../pages/MapasMentais'));
const Legislacao = lazy(() => import('../pages/Legislacao'));
const Flashcards = lazy(() => import('../pages/Flashcards'));
const Simulados = lazy(() => import('../pages/Simulados'));
const Edital = lazy(() => import('../pages/Edital'));
const Disciplinas = lazy(() => import('../pages/Disciplinas'));
const DisciplinaDetalhe = lazy(() => import('../pages/DisciplinaDetalhe'));
const Questoes = lazy(() => import('../pages/Questoes'));
const Planos = lazy(() => import('../pages/Planos'));
const ConcursosDisponiveis = lazy(() => import('../pages/ConcursosDisponiveis'));
const ConcursoDetalhe = lazy(() => import('../pages/ConcursoDetalhe'));
const LembretesCalendario = lazy(() => import('../pages/LembretesCalendario'));
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
const AdminConcursos = lazy(() => import('../pages/AdminConcursos'));
const AdminDisciplinasPadrao = lazy(() => import('../pages/AdminDisciplinasPadrao'));
const AdminUsuarios = lazy(() => import('../pages/AdminUsuarios'));
const AdminFinance = lazy(() => import('../pages/AdminFinance'));
const AdminCRM = lazy(() => import('../pages/AdminCRM'));
const AdminConfiguracoes = lazy(() => import('../pages/AdminConfiguracoes'));
const AdminAudiolivros = lazy(() => import('../pages/AdminAudiolivros'));
const AdminMindMapsGallery = lazy(() => import('../pages/AdminMindMapsGallery'));
const AdminLegislacao = lazy(() => import('../pages/AdminLegislacao'));
const AdminBetaConvites = lazy(() => import('../pages/AdminBetaConvites'));
const AdminBetaFeedback = lazy(() => import('../pages/AdminBetaFeedback'));
const AdminAssinaturas = lazy(() => import('../pages/AdminAssinaturas'));
const AdminQuestoes = lazy(() => import('../pages/AdminQuestoes'));
const Sessoes = lazy(() => import('../pages/Sessoes'));
const Revisoes = lazy(() => import('../pages/Revisoes'));
const EditalQuestao = lazy(() => import('../pages/EditalQuestao'));
const Historico = lazy(() => import('../pages/Historico'));
const Materiais = lazy(() => import('../pages/Materiais'));
const MetasSemana = lazy(() => import('../pages/MetasSemana'));

const KNOWN_TABS = [
  'home',
  'concursos',
  'meus_concursos',
  'lembretes',
  'concurso_detalhe',
  'admin_dashboard',
  'admin_concursos',
  'admin_questoes',
  'admin_disciplinas',
  'admin_usuarios',
  'admin_finance',
  'admin_crm',
  'admin_configuracoes',
  'admin_audiolivros',
  'admin_mapas_mentais',
  'admin_legislacao',
  'admin_beta_convites',
  'admin_beta_feedback',
  'admin_assinaturas',
  'planos',
  'disciplinas',
  'assinatura',
  'edital',
  'planejamento',
  'historico',
  'estatisticas',
  'sessoes',
  'flashcards',
  'revisoes',
  'questoes',
  'simulados',
  'redacoes',
  'audiobooks',
  'mapas',
  'legislacao',
  'edital_questao',
  'materiais',
  'metas',
  'comunidades',
  'esquadroes',
  'conciliar',
  'aplicativos',
  'bem_estar',
  'convide_ganhe',
  'perfil',
];

export default function AppTabContent(props) {
  const {
    activeTab,
    openTimerSetup,
    setActiveTab,
    progGeralEdital,
    agendaHoje,
    agendaAmanha,
    historicoReal,
    targetContestSummary,
    targetContestDisciplines,
    smartStudyPlan,
    dailyRoutine,
    setSelectedContestDetailId,
    handleDisciplineClick,
    startRecommendedStudySession,
    temaAtivo,
    setTemaAtivo,
    effectiveProfile,
    profileHasValidCpf,
    currentUserEmail,
    profileMetrics,
    levelSummary,
    badgeSummary,
    redacaoSummary,
    squadSummary,
    audiobookSummary,
    setSelectedCommunitySquadId,
    handleSaveProfile,
    handleAvatarChange,
    handleLogout,
    isAdmin,
    wellnessLibrary,
    activeWellnessTrackId,
    handleStartWellnessTrack,
    communityState,
    cursos,
    bancoDisciplinas,
    myContests,
    setTargetContestId,
    createCourse,
    createCourseFromCatalog,
    importSelectedEditalWithAI,
    analyzeEditalDocument,
    deleteCourse,
    setSelectedCoursePlan,
    contestLibrary,
    currentCourseLimit,
    currentCourseCount,
    remainingCourseSlots,
    favoriteContestIds,
    interestedContestIds,
    setFavoriteContestIds,
    setInterestedContestIds,
    allReminderNotifications,
    contestChecklistHistory,
    studyPlanningMode,
    planningDisciplines,
    planningStudyRecommendation,
    weeklyAvailability,
    activeCycle,
    manualReminders,
    handleSaveManualReminder,
    handleDeleteManualReminder,
    sharedCalendarViewMode,
    setSharedCalendarViewMode,
    sharedCalendarDate,
    setSharedCalendarDate,
    selectedContestDetail,
    contestTrackers,
    setContestTrackers,
    targetContestId,
    adminProfiles,
    adminExpenses,
    adminLeads,
    progressConfig,
    handleSaveProgressConfig,
    subjectCatalog,
    createContestTemplate,
    updateContestTemplate,
    duplicateContestTemplate,
    promoteContestTemplate,
    deleteContestTemplate,
    uploadContestImage,
    uploadContestEdital,
    removeContestImage,
    removeContestEdital,
    saveSubjectCatalogEntry,
    deleteSubjectCatalogEntry,
    updateAdminProfile,
    saveAdminExpense,
    deleteAdminExpense,
    saveAdminLead,
    deleteAdminLead,
    handleSaveWellnessLibrary,
    viewingDiscipline,
    setBancoDisciplinas,
    setViewingDiscipline,
    setEditingDiscipline,
    setRegistroEstudoModalOpen,
    disciplineViewToken,
    setLinkModalOpen,
    toggleEditalTopico,
    highlightedDisciplineTopicId,
    expandedEditalSubject,
    setExpandedEditalSubject,
    planningContestSummary,
    setWeeklyAvailability,
    setStudyPlanningMode,
    planningCourseOptions,
    planningCoursePlans,
    planningActivePlans,
    setPlanningCoursePlans,
    planningSubjectConfig,
    setPlanningSubjectConfig,
    planningSessionWindow,
    setPlanningSessionWindow,
    planningAvailableDisciplines,
    sharedReminderCalendarEvents,
    planWizardStep,
    setPlanWizardStep,
    isEditingCycle,
    setIsEditingCycle,
    wizData,
    setWizData,
    toggleWizMateria,
    handlePesoChange,
    totalWeightPreview,
    minConcluidosCiclo,
    totMinutosCiclo,
    progressoCiclo,
    showFinishedSessions,
    setShowFinishedSessions,
    toggleSessionConcluida,
    donutData,
    setChartTooltip,
    formatTimeStr,
    formatHHMMSS,
    resetCycleWizard,
    restartActiveCycle,
    removeActiveCycle,
    finalizeCycleWizard,
    setIsFilterPanelOpen,
    historyPresetFilter,
    historyPresetQuery,
    customFocusTime,
    setCustomFocusTime,
    customPauseTime,
    setCustomPauseTime,
    startSpecificTimer,
    timerMode,
    timerValue,
    timerMax,
    isTimerRunning,
    setIsTimerRunning,
    handleStopTimer,
    studySessionDraft,
    isEditingMeta,
    setIsEditingMeta,
    metaDiariaQuestoes,
    setMetaDiariaQuestoes,
    setIsCadernoModalOpen,
    setRegistroSimuladoModalOpen: _setRegistroSimuladoModalOpen,
    openBlankSimuladoModal: _openBlankSimuladoModal,
    openSimuladoReviewModal,
    openHistoricoWithFilter,
    simulados,
    simuladoStats,
    currentUserId,
    redacoes,
    redacoesPersistence,
    saveRedacaoNoApp,
    deleteRedacaoNoApp,
    redacaoExpertTips,
    handleSaveRedacaoExpertTips,
    redacaoThemeBankOverride,
    redacaoKitOverride,
    audiobookCatalogOverride,
    redacaoThemeBankEffective,
    handleSaveRedacaoSiteContent,
    handleSaveAudiolivrosContent,
    audiobookCatalog,
    currentAudiobookState,
    handleSaveAudiobookState,
    sidebarLabelsOverride,
    handleSaveSidebarLabels,
    selectedCoursePlan,
    openStudyRegisterForDiscipline,
    communityRankings,
    communityMetrics,
    handleSaveCommunityState,
    handleCreateCommunityPost,
    handleCreateCommunityComment,
    handleToggleCommunityReaction,
    handleRegisterCommunityView,
    onReloadCommunity,
    communitySmokeTest,
    communityConnectivity,
    handleRunCommunityConnectivityCheck,
    handleRunCommunitySmokeTest,
    isPremiumPlan,
    isElitePlan,
    communityPersistence,
    selectedCommunitySquadId,
    onOpenAdminLegislacao,
  } = props;
  const normalizeName = (value = '') => {
    const text = String(value || '').trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const fullName = String(effectiveProfile?.nome || effectiveProfile?.name || effectiveProfile?.full_name || '').trim();
  const firstName = normalizeName(fullName.split(/\s+/).filter(Boolean)[0] || '');
  const username = String(effectiveProfile?.username || effectiveProfile?.user_name || '').trim();
  const emailPrefix = normalizeName(
    String(currentUserEmail || '').includes('@') ? String(currentUserEmail || '').split('@')[0] : ''
  );
  const greetingName = username || firstName || emailPrefix;

  if (activeTab === 'home') {
    return (
      <Dashboard
        openTimerSetup={openTimerSetup}
        setActiveTab={setActiveTab}
        userDisplayName={greetingName}
        progGeralEdital={progGeralEdital}
        agendaHoje={agendaHoje}
        agendaAmanha={agendaAmanha}
        historicoReal={historicoReal}
        targetContest={targetContestSummary}
        targetDisciplines={targetContestDisciplines}
        studyRecommendation={smartStudyPlan}
        dailyRoutine={dailyRoutine}
        onOpenTargetContest={(contestId) => {
          setSelectedContestDetailId(contestId);
          setActiveTab('concurso_detalhe');
        }}
        onOpenRecommendedDiscipline={handleDisciplineClick}
        onStartRecommendedSession={startRecommendedStudySession}
        onStartRoutineItem={startRecommendedStudySession}
      />
    );
  }

  if (activeTab === 'perfil') {
    return (
      <Perfil
        temaAtivo={temaAtivo}
        setTemaAtivo={setTemaAtivo}
        setActiveTab={setActiveTab}
        profile={effectiveProfile}
        profileHasValidCpf={profileHasValidCpf}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        xpSummary={{ ...profileMetrics, ...levelSummary }}
        badgeSummary={badgeSummary}
        essaySummary={redacaoSummary}
        squadSummary={squadSummary}
        audiobookSummary={audiobookSummary}
        onOpenSquad={(squadId) => {
          setSelectedCommunitySquadId(squadId);
          setActiveTab('esquadroes');
        }}
        onSaveProfile={handleSaveProfile}
        onChangeAvatar={handleAvatarChange}
        onLogout={handleLogout}
      />
    );
  }

  if (activeTab === 'assinatura') {
    return (
      <Assinatura
        temaAtivo={temaAtivo}
        setActiveTab={setActiveTab}
        currentUserId={currentUserId}
        currentProfile={effectiveProfile}
        onProfileUpdate={(patch) => handleSaveProfile({ ...(effectiveProfile || {}), ...(patch || {}) })}
      />
    );
  }

  if (activeTab === 'bem_estar') {
    return (
      <BemEstar
        tracks={wellnessLibrary}
        isAdmin={isAdmin}
        setActiveTab={setActiveTab}
        activeTrackId={activeWellnessTrackId}
        onPlayTrack={handleStartWellnessTrack}
      />
    );
  }

  if (activeTab === 'convide_ganhe') {
    return (
      <ConvideGanhe
        profile={effectiveProfile}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        referralCode={effectiveProfile?.referral_code || communityState?.referralCode || ''}
      />
    );
  }

  if (activeTab === 'planos') {
    return (
      <Planos
        progGeralEdital={progGeralEdital}
        setActiveTab={setActiveTab}
        cursos={cursos}
        bancoDisciplinas={bancoDisciplinas}
        myContests={myContests}
        targetContest={targetContestSummary}
        onSetTargetContest={setTargetContestId}
        onOpenContestDetail={(contestId) => {
          setSelectedContestDetailId(contestId);
          setActiveTab('concurso_detalhe');
        }}
        onCreateCourse={createCourse}
        onImportCatalogCourse={createCourseFromCatalog}
        onImportEdital={importSelectedEditalWithAI}
        onAnalyzeEdital={analyzeEditalDocument}
        onDeleteCourse={deleteCourse}
        setSelectedCoursePlan={setSelectedCoursePlan}
        concursoCatalog={contestLibrary}
        currentCourseLimit={currentCourseLimit}
        currentCourseCount={currentCourseCount}
        remainingCourseSlots={remainingCourseSlots}
        isAdmin={isAdmin}
      />
    );
  }

  if (activeTab === 'concursos') {
    return (
      <ConcursosDisponiveis
        concursoCatalog={contestLibrary}
        onImportCatalogCourse={createCourseFromCatalog}
        setActiveTab={setActiveTab}
        onOpenContestDetail={(contest) => {
          setSelectedContestDetailId(contest?.id || null);
          setActiveTab('concurso_detalhe');
        }}
        currentCourseLimit={currentCourseLimit}
        currentCourseCount={currentCourseCount}
        remainingCourseSlots={remainingCourseSlots}
        isAdmin={isAdmin}
        favoriteContestIds={favoriteContestIds}
        interestedContestIds={interestedContestIds}
        cursos={cursos}
      />
    );
  }

  if (activeTab === 'lembretes') {
    return (
        <LembretesCalendario
        notifications={allReminderNotifications}
        agendaHoje={agendaHoje}
        agendaAmanha={agendaAmanha}
        checklistHistory={contestChecklistHistory}
        studyPlanningMode={studyPlanningMode}
        targetContest={targetContestSummary}
        planningDisciplines={planningDisciplines}
        planningStudyRecommendation={planningStudyRecommendation}
        weeklyAvailability={weeklyAvailability}
        activeCycle={activeCycle}
        onOpenContest={(contestId) => {
          setSelectedContestDetailId(contestId);
          setActiveTab('concurso_detalhe');
        }}
        onOpenDiscipline={handleDisciplineClick}
          manualReminders={manualReminders}
          onSaveReminder={handleSaveManualReminder}
          onDeleteReminder={handleDeleteManualReminder}
          currentUserId={currentUserId}
          contestOptions={contestLibrary}
        sharedCalendarViewMode={sharedCalendarViewMode}
        setSharedCalendarViewMode={setSharedCalendarViewMode}
        sharedCalendarDate={sharedCalendarDate}
        setSharedCalendarDate={setSharedCalendarDate}
      />
    );
  }

  if (activeTab === 'concurso_detalhe') {
    return (
      <ConcursoDetalhe
        contest={selectedContestDetail}
        onBack={() => {
          setSelectedContestDetailId(null);
          setActiveTab('concursos');
        }}
        onImport={createCourseFromCatalog}
        importingId=""
        limiteAtingido={!isAdmin && remainingCourseSlots <= 0}
        cursos={cursos}
        bancoDisciplinas={bancoDisciplinas}
        isFavorite={favoriteContestIds.includes(selectedContestDetail?.id)}
        isInterested={interestedContestIds.includes(selectedContestDetail?.id)}
        onToggleFavorite={(contestId) =>
          setFavoriteContestIds((prev) =>
            prev.includes(contestId) ? prev.filter((id) => id !== contestId) : [...prev, contestId]
          )
        }
        onToggleInterested={(contestId) =>
          setInterestedContestIds((prev) =>
            prev.includes(contestId) ? prev.filter((id) => id !== contestId) : [...prev, contestId]
          )
        }
        onOpenDisciplinas={(contest) => {
          setSelectedCoursePlan(contest?.plano || contest?.nome || 'Todos');
          setActiveTab('disciplinas');
        }}
        contestTracker={contestTrackers[selectedContestDetail?.id] || {}}
        onToggleContestTask={(contestId, taskKey) =>
          setContestTrackers((prev) => ({
            ...prev,
            [contestId]: {
              ...(prev[contestId] || {}),
              [taskKey]: !prev[contestId]?.[taskKey],
            },
          }))
        }
        isTargetContest={selectedContestDetail?.id === targetContestId}
        onSetTargetContest={setTargetContestId}
      />
    );
  }

  if (activeTab === 'admin_dashboard' && isAdmin) {
    return (
      <AdminDashboard
        contestLibrary={contestLibrary}
        cursos={cursos}
        bancoDisciplinas={bancoDisciplinas}
        historicoReal={historicoReal}
        profiles={adminProfiles}
        expenses={adminExpenses}
        leads={adminLeads}
        setActiveTab={setActiveTab}
        progressConfig={progressConfig}
        onSaveProgressConfig={handleSaveProgressConfig}
      />
    );
  }

  if (activeTab === 'admin_concursos' && isAdmin) {
    return (
      <AdminConcursos
        currentUserEmail={currentUserEmail}
        concursoCatalog={contestLibrary}
        subjectCatalog={subjectCatalog}
        onCreateTemplate={createContestTemplate}
        onUpdateTemplate={updateContestTemplate}
        onDuplicateTemplate={duplicateContestTemplate}
        onPromoteTemplate={promoteContestTemplate}
        onDeleteTemplate={deleteContestTemplate}
        onUploadImage={uploadContestImage}
        onUploadEdital={uploadContestEdital}
        onRemoveImage={removeContestImage}
        onRemoveEdital={removeContestEdital}
      />
    );
  }

  if (activeTab === 'admin_questoes' && isAdmin) {
    return (
      <AdminQuestoes currentUserEmail={currentUserEmail} />
    );
  }

  if (activeTab === 'admin_disciplinas' && isAdmin) {
    return (
      <AdminDisciplinasPadrao
        subjectCatalog={subjectCatalog}
        onSaveSubject={saveSubjectCatalogEntry}
        onDeleteSubject={deleteSubjectCatalogEntry}
      />
    );
  }

  if (activeTab === 'admin_usuarios' && isAdmin) {
    return (
      <AdminUsuarios
        profiles={adminProfiles}
        currentUserEmail={currentUserEmail}
        onUpdateProfile={updateAdminProfile}
      />
    );
  }

  if (activeTab === 'admin_finance' && isAdmin) {
    return (
      <AdminFinance
        profiles={adminProfiles}
        expenses={adminExpenses}
        currentUserEmail={currentUserEmail}
        onSaveExpense={saveAdminExpense}
        onDeleteExpense={deleteAdminExpense}
      />
    );
  }

  if (activeTab === 'admin_crm' && isAdmin) {
    return (
      <AdminCRM
        leads={adminLeads}
        currentUserEmail={currentUserEmail}
        onSaveLead={saveAdminLead}
        onDeleteLead={deleteAdminLead}
      />
    );
  }

  if (activeTab === 'admin_audiolivros' && isAdmin) {
    return (
      <AdminAudiolivros
        audiobookCatalogOverride={audiobookCatalogOverride}
        onSaveAudiolivrosContent={handleSaveAudiolivrosContent}
      />
    );
  }

  if (activeTab === 'admin_mapas_mentais' && isAdmin) {
    return (
      <AdminMindMapsGallery
        bancoDisciplinas={bancoDisciplinas}
        contestLibrary={contestLibrary}
        subjectCatalog={subjectCatalog}
        currentUserId={currentUserId}
      />
    );
  }

  if (activeTab === 'admin_legislacao' && isAdmin) {
    return <AdminLegislacao currentUserId={currentUserId} />;
  }

  if (activeTab === 'admin_assinaturas' && isAdmin) {
    return <AdminAssinaturas />;
  }

  if (activeTab === 'admin_beta_convites' && isAdmin) {
    return <AdminBetaConvites />;
  }

  if (activeTab === 'admin_beta_feedback' && isAdmin) {
    return <AdminBetaFeedback />;
  }

  if (activeTab === 'admin_configuracoes' && isAdmin) {
    return (
        <AdminConfiguracoes
          contestLibrary={contestLibrary}
          cursos={cursos}
          bancoDisciplinas={bancoDisciplinas}
          progressConfig={progressConfig}
        onSaveProgressConfig={handleSaveProgressConfig}
        wellnessLibrary={wellnessLibrary}
        onSaveWellnessLibrary={handleSaveWellnessLibrary}
        redacaoExpertTips={redacaoExpertTips}
        onSaveRedacaoExpertTips={handleSaveRedacaoExpertTips}
        redacaoThemeBankEffective={redacaoThemeBankEffective}
        redacaoKitOverride={redacaoKitOverride}
        audiobookCatalogOverride={audiobookCatalogOverride}
        onSaveRedacaoSiteContent={handleSaveRedacaoSiteContent}
        sidebarLabelsOverride={sidebarLabelsOverride}
        onSaveSidebarLabels={handleSaveSidebarLabels}
      />
    );
  }

  if (activeTab === 'disciplinas' && !viewingDiscipline) {
    return (
      <Disciplinas
        bancoDisciplinas={bancoDisciplinas}
        setBancoDisciplinas={setBancoDisciplinas}
        setViewingDiscipline={setViewingDiscipline}
        setEditingDiscipline={setEditingDiscipline}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        subjectCatalog={subjectCatalog}
        forcedPlanoFiltro={
          selectedCoursePlan === 'Todos' && targetContestSummary?.plano
            ? targetContestSummary.plano
            : selectedCoursePlan
        }
      />
    );
  }

  if (activeTab === 'disciplinas' && viewingDiscipline) {
    return (
      <DisciplinaDetalhe
        key={`${viewingDiscipline.id || 'disciplina'}-${disciplineViewToken}`}
        viewingDiscipline={viewingDiscipline}
        setViewingDiscipline={setViewingDiscipline}
        setEditingDiscipline={setEditingDiscipline}
        setLinkModalOpen={setLinkModalOpen}
        toggleEditalTopico={toggleEditalTopico}
        highlightedTopicId={highlightedDisciplineTopicId}
      />
    );
  }

  if (activeTab === 'edital') {
      return (
        <Edital
          currentUserId={currentUserId}
          editalText={targetContestSummary?.edital_text || targetContestSummary?.editalText || ''}
          bancoDisciplinas={bancoDisciplinas}
          cursos={cursos}
          targetContest={targetContestSummary}
          expandedEditalSubject={expandedEditalSubject}
        setExpandedEditalSubject={setExpandedEditalSubject}
        toggleEditalTopico={toggleEditalTopico}
        setEditingDiscipline={setEditingDiscipline}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        setLinkModalOpen={setLinkModalOpen}
      />
    );
  }

  if (activeTab === 'planejamento' || activeTab === 'ciclos') {
    return (
      <Planejamento
        currentUserId={currentUserId}
        targetContest={planningContestSummary}
        targetDisciplines={planningDisciplines}
        studyRecommendation={planningStudyRecommendation}
        weeklyAvailability={weeklyAvailability}
        setWeeklyAvailability={setWeeklyAvailability}
        onOpenRecommendedDiscipline={handleDisciplineClick}
        onStartRecommendedSession={startRecommendedStudySession}
        studyMode={studyPlanningMode}
        setStudyMode={setStudyPlanningMode}
        planningCourseOptions={planningCourseOptions}
        planningCoursePlans={planningCoursePlans}
        effectivePlanningCoursePlans={planningActivePlans}
        setPlanningCoursePlans={setPlanningCoursePlans}
        planningSubjectConfig={planningSubjectConfig}
        setPlanningSubjectConfig={setPlanningSubjectConfig}
        planningSessionWindow={planningSessionWindow}
        setPlanningSessionWindow={setPlanningSessionWindow}
        planningAvailableDisciplines={planningAvailableDisciplines}
        subjectCatalog={subjectCatalog}
        setSelectedCoursePlan={setSelectedCoursePlan}
        externalCalendarEvents={sharedReminderCalendarEvents}
        sharedCalendarViewMode={sharedCalendarViewMode}
        setSharedCalendarViewMode={setSharedCalendarViewMode}
        sharedCalendarDate={sharedCalendarDate}
        setSharedCalendarDate={setSharedCalendarDate}
        cycleProps={{
          planWizardStep,
          setPlanWizardStep,
          isEditingCycle,
          setIsEditingCycle,
          wizData,
          setWizData,
          bancoDisciplinas: planningAvailableDisciplines.filter((disciplina) =>
            planningActivePlans.length === 0 ? true : planningActivePlans.includes(disciplina.plano)
          ),
          toggleWizMateria,
          handlePesoChange,
          totalWeightPreview,
          minConcluidosCiclo,
          totMinutosCiclo,
          progressoCiclo,
          showFinishedSessions,
          setShowFinishedSessions,
          activeCycle,
          toggleSessionConcluida,
          openTimerSetup,
          setRegistroEstudoModalOpen,
          donutData,
          setChartTooltip,
          formatTimeStr,
          onResetCycle: resetCycleWizard,
          onRestartCycle: restartActiveCycle,
          onRemoveCycle: removeActiveCycle,
          onFinalizeCycle: finalizeCycleWizard,
        }}
      />
    );
  }

  if (activeTab === 'historico') {
    return (
      <Historico
        historicoReal={historicoReal}
        subjectCatalog={subjectCatalog}
        initialQuery={historyPresetQuery}
        initialFilter={historyPresetFilter}
        setIsFilterPanelOpen={setIsFilterPanelOpen}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        handleDisciplineClick={handleDisciplineClick}
      />
    );
  }

  if (activeTab === 'estatisticas') {
    return (
      <Estatisticas
        setIsFilterPanelOpen={setIsFilterPanelOpen}
        historicoReal={historicoReal}
        bancoDisciplinas={bancoDisciplinas}
        subjectCatalog={subjectCatalog}
        redacaoSummary={redacaoSummary}
      />
    );
  }

  if (activeTab === 'sessoes') {
    return (
        <Sessoes
          currentUserId={currentUserId}
          customFocusTime={customFocusTime}
        setCustomFocusTime={setCustomFocusTime}
        customPauseTime={customPauseTime}
        setCustomPauseTime={setCustomPauseTime}
        startSpecificTimer={startSpecificTimer}
        openTimerSetup={openTimerSetup}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        historicoReal={historicoReal}
        studyRecommendation={smartStudyPlan}
        onStartRecommendedSession={startRecommendedStudySession}
        setActiveTab={setActiveTab}
        timerMode={timerMode}
        timerValue={timerValue}
        timerMax={timerMax}
        isTimerRunning={isTimerRunning}
        setIsTimerRunning={setIsTimerRunning}
        handleStopTimer={handleStopTimer}
        formatHHMMSS={formatHHMMSS}
        studySessionDraft={studySessionDraft}
      />
    );
  }

  if (activeTab === 'flashcards') return <Flashcards currentUserId={currentUserId} />;

  if (activeTab === 'materiais') return <Materiais currentUserId={currentUserId} />;

  if (activeTab === 'metas') {
    return <MetasSemana currentUserId={currentUserId} historicoReal={historicoReal} />;
  }

  if (activeTab === 'revisoes') {
    return (
        <Revisoes
          setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
          setActiveTab={setActiveTab}
          targetContest={targetContestSummary}
          studyRecommendation={smartStudyPlan}
          onOpenRecommendedDiscipline={handleDisciplineClick}
          onStartRecommendedSession={startRecommendedStudySession}
          currentUserId={currentUserId}
        />
      );
  }

  if (activeTab === 'questoes') {
      return (
        <Questoes
          currentUserId={currentUserId}
          isEditingMeta={isEditingMeta}
        setIsEditingMeta={setIsEditingMeta}
        metaDiariaQuestoes={metaDiariaQuestoes}
        setMetaDiariaQuestoes={setMetaDiariaQuestoes}
        setIsCadernoModalOpen={setIsCadernoModalOpen}
        setRegistroEstudoModalOpen={setRegistroEstudoModalOpen}
        historicoReal={historicoReal}
        subjectCatalog={subjectCatalog}
        studyRecommendation={smartStudyPlan}
        onStartRecommendedSession={startRecommendedStudySession}
        setActiveTab={setActiveTab}
      />
    );
  }

  if (activeTab === 'simulados') {
    return (
      <Simulados
        openSimuladoReviewModal={openSimuladoReviewModal}
        openHistoricoWithFilter={openHistoricoWithFilter}
        setIsCadernoModalOpen={setIsCadernoModalOpen}
        historicoReal={historicoReal}
        subjectCatalog={subjectCatalog}
        simulados={simulados}
        simuladoStats={simuladoStats}
        profile={effectiveProfile}
        currentUserId={currentUserId}
        redacaoSummary={redacaoSummary}
        communityMetrics={communityMetrics}
      />
    );
  }

  if (activeTab === 'redacoes') {
    return (
      <Redacoes
        redacoes={redacoes}
        redacaoSummary={redacaoSummary}
        persistenceMode={redacoesPersistence.mode}
        persistenceReady={redacoesPersistence.schemaReady}
        persistenceLoading={redacoesPersistence.loading}
        currentUserId={currentUserId}
        onSaveRedacao={saveRedacaoNoApp}
        onDeleteRedacao={deleteRedacaoNoApp}
        redacaoExpertTips={redacaoExpertTips}
        redacaoThemeBankOverride={redacaoThemeBankOverride}
        redacaoKitOverride={redacaoKitOverride}
      />
    );
  }

  if (activeTab === 'audiobooks') {
    return (
      <Audiobooks
        profile={effectiveProfile}
        currentUserId={currentUserId}
        bancoDisciplinas={bancoDisciplinas}
        catalog={audiobookCatalog}
        audiobookState={currentAudiobookState}
        onSaveAudiobookState={handleSaveAudiobookState}
        onOpenDiscipline={handleDisciplineClick}
        onOpenProfile={() => setActiveTab('perfil')}
      />
    );
  }

  if (activeTab === 'mapas') {
    return (
      <MapasMentais
        bancoDisciplinas={bancoDisciplinas}
        subjectCatalog={subjectCatalog}
        contestLibrary={contestLibrary}
        currentUserId={currentUserId}
        selectedCoursePlan={selectedCoursePlan}
        targetContestId={targetContestId}
        isAdmin={isAdmin}
        onOpenAdminMindMaps={() => setActiveTab('admin_mapas_mentais')}
        onOpenDiscipline={handleDisciplineClick}
        onOpenContest={(contestId) => {
          setSelectedContestDetailId(contestId);
          setActiveTab('concurso_detalhe');
        }}
        onOpenStudyRegister={openStudyRegisterForDiscipline}
      />
    );
  }

  if (activeTab === 'legislacao') {
    return <Legislacao isAdmin={isAdmin} currentUserId={currentUserId} onOpenAdminLegislacao={onOpenAdminLegislacao} />;
  }

  if (activeTab === 'edital_questao') {
    return (
      <EditalQuestao
        bancoDisciplinas={bancoDisciplinas}
        cursos={cursos}
        historicoReal={historicoReal}
        subjectCatalog={subjectCatalog}
        selectedCoursePlan={selectedCoursePlan}
        toggleEditalTopico={toggleEditalTopico}
        onOpenDiscipline={handleDisciplineClick}
        onOpenStudyRegister={openStudyRegisterForDiscipline}
        onNavigate={setActiveTab}
        onOpenPlanos={() => setActiveTab('planos')}
      />
    );
  }

  if (activeTab === 'comunidades') {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Comunidades
        currentUserId={currentUserId}
        currentUsername={effectiveProfile?.username || ''}
        profile={effectiveProfile}
        currentUserEmail={currentUserEmail}
        squadSummary={squadSummary}
        communityState={communityState}
        rankingData={communityRankings}
        profileMetrics={communityMetrics}
        onSaveCommunityState={handleSaveCommunityState}
        onCreatePost={handleCreateCommunityPost}
        onCreateComment={handleCreateCommunityComment}
        onToggleReaction={handleToggleCommunityReaction}
        onViewPost={handleRegisterCommunityView}
        onReloadCommunity={onReloadCommunity}
        smokeTest={communitySmokeTest}
        connectivityCheck={communityConnectivity}
        onRunConnectivityCheck={handleRunCommunityConnectivityCheck}
        onRunSmokeTest={handleRunCommunitySmokeTest}
        isPremium={isPremiumPlan}
        isElite={isElitePlan || isAdmin}
        isAdmin={isAdmin}
        persistenceMode={communityPersistence.mode}
        communitySchemaReady={communityPersistence.schemaReady}
        selectedSquadId={selectedCommunitySquadId}
        onSelectSquad={(squadId) => {
          setSelectedCommunitySquadId(squadId);
          if (squadId) setActiveTab('esquadroes');
        }}
        />
      </div>
    );
  }

  if (activeTab === 'esquadroes') {
    return (
      <Esquadroes
        currentUserId={currentUserId}
        profile={effectiveProfile}
        currentUsername={effectiveProfile?.username || ''}
        currentUserEmail={currentUserEmail}
        squadSummary={squadSummary}
        communityState={communityState}
        onSaveCommunityState={handleSaveCommunityState}
        isElite={isElitePlan || isAdmin}
        selectedSquadId={selectedCommunitySquadId}
        onSelectSquad={setSelectedCommunitySquadId}
        bancoDisciplinas={bancoDisciplinas}
        subjectCatalog={subjectCatalog}
        myContests={myContests}
        historicoReal={historicoReal}
        contestLibrary={contestLibrary}
        concursoCatalog={contestLibrary}
        cursos={cursos}
        targetContestId={targetContestId}
      />
    );
  }

  if (activeTab === 'conciliar') {
    return (
      <Conciliador
        concursoCatalog={contestLibrary}
        subjectCatalog={subjectCatalog}
        myContests={myContests}
        cursos={cursos}
        bancoDisciplinas={bancoDisciplinas}
        historicoReal={historicoReal}
        targetContestId={targetContestId}
        onSetTargetContest={setTargetContestId}
        onOpenContestDetail={(contestId) => {
          setSelectedContestDetailId(contestId);
          setActiveTab('concurso_detalhe');
        }}
      />
    );
  }

  if (activeTab === 'aplicativos') return <Aplicativos />;

  if (!KNOWN_TABS.includes(activeTab)) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-10">
        <Target size={40} className="text-[#2563EB] mb-6" />
        <h2 className="text-3xl font-black text-gray-800 mb-2">Construção em Progresso!</h2>
        <button
          onClick={() => setActiveTab('home')}
          className="bg-[#2563EB] text-white px-6 py-2.5 rounded-xl font-bold"
        >
          Voltar ao Inicio
        </button>
      </div>
    );
  }

  return null;
}
