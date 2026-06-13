import React, { useState } from "react";
import PropTypes from "prop-types";
import { ShieldCheck, BarChart3, Settings, Users } from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { useNotifications } from "../hooks/useNotifications";

import NotificationBell from "./shared/NotificationBell";
import AuditModal from "./shared/AuditModal";
import BulkPrintContainer from "./shared/BulkPrintContainer";

import CasesTab from "./ic/CasesTab";
import DashboardTab from "./ic/DashboardTab";
import UsersTab from "./ic/UsersTab";
import SettingsTab from "./ic/SettingsTab";

export default function ICCommandCenter({
  currentUser,
  wards,
  systemUsers,
  cdcConfig,
  assessments,
  fetchGlobalData,
  fetchAssessments,
  setCdcConfig,
  showToast,
  systemCategories,
  viewedCases,
  markCaseAsViewed,
  isCaseNew,
  updateCurrentUser,
}) {
  const [icTab, setIcTab] = useState(
    () => localStorage.getItem("ic_tab") || "cases",
  );

  const handleTabChange = (tab) => {
    setIcTab(tab);
    localStorage.setItem("ic_tab", tab);
  };

  const {
    notifications,
    unreadCount,
    showPanel: showNotifPanel,
    setShowPanel: setShowNotifPanel,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotifications(currentUser);

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [caseNotes, setCaseNotes] = useState({});
  const [selectedPrintIds, setSelectedPrintIds] = useState([]);

  const handleOpenAuditModal = async (assessment) => {
    setSelectedAssessment(assessment);
    setShowAuditModal(true);
    markCaseAsViewed(assessment.id);
  };

  const handleUpdateStatus = async (assessment, newStatus, note) => {
    const { error } = await supabase
      .from("assessments")
      .update({ status: newStatus, ic_notes: note })
      .match({ id: assessment.id });
    if (error) {
      showToast("error", `อัปเดตไม่สำเร็จ: ${error.message}`);
      return;
    }
    await supabase.from("audit_logs").insert([
      {
        assessment_id: assessment.id,
        action_type: "UPDATE_STATUS",
        old_value: assessment.status,
        new_value: newStatus,
        changed_by: currentUser.id,
        details: note || "IC Head Review",
      },
    ]);
    setCaseNotes((prev) => {
      const updated = { ...prev };
      delete updated[assessment.id];
      return updated;
    });
    showToast("success", `อัปเดตสถานะเป็น ${newStatus}`);
    fetchAssessments();
    setShowAuditModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Command Center
          </h2>
          <p className="text-slate-500 font-medium mt-1">
            ศูนย์บัญชาการและบริหารจัดการระบาดวิทยา
          </p>
        </div>
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          showPanel={showNotifPanel}
          setShowPanel={setShowNotifPanel}
          markAsRead={markAsRead}
          markAllAsRead={markAllAsRead}
          clearAll={clearAll}
          title="การแจ้งเตือน"
          emptyMessage="ไม่มีการแจ้งเตือน"
          variant="ic"
        />
      </div>

      <div className="p-1.5 rounded-2xl inline-flex mb-4 bg-white border border-slate-200 shadow-sm overflow-x-auto max-w-full">
        {[
          { tab: "cases", icon: ShieldCheck, label: "Case Management" },
          { tab: "dashboard", icon: BarChart3, label: "Dashboard & Reports" },
          { tab: "users", icon: Users, label: "Wards & Users" },
          { tab: "settings", icon: Settings, label: "JSON Builder" },
        ].map(({ tab, icon: Icon, label }) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${icTab === tab ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {icTab === "cases" && (
        <CasesTab
          assessments={assessments}
          wards={wards}
          systemCategories={systemCategories}
          handleOpenAuditModal={handleOpenAuditModal}
          handleUpdateStatus={handleUpdateStatus}
          markCaseAsViewed={markCaseAsViewed}
          isCaseNew={isCaseNew}
          caseNotes={caseNotes}
          setCaseNotes={setCaseNotes}
          selectedPrintIds={selectedPrintIds}
          setSelectedPrintIds={setSelectedPrintIds}
        />
      )}
      {icTab === "dashboard" && (
        <DashboardTab
          assessments={assessments}
          cdcConfig={cdcConfig}
          currentUser={currentUser}
        />
      )}
      {icTab === "users" && (
        <UsersTab
          wards={wards}
          systemUsers={systemUsers}
          fetchGlobalData={fetchGlobalData}
          showToast={showToast}
          currentUser={currentUser}
          updateCurrentUser={updateCurrentUser}
        />
      )}
      {icTab === "settings" && (
        <SettingsTab
          cdcConfig={cdcConfig}
          systemCategories={systemCategories}
          fetchGlobalData={fetchGlobalData}
          setCdcConfig={setCdcConfig}
          showToast={showToast}
          currentUser={currentUser}
        />
      )}

      <AuditModal
        show={showAuditModal}
        assessment={selectedAssessment}
        onClose={() => setShowAuditModal(false)}
        systemUsers={systemUsers}
        markCaseAsViewed={markCaseAsViewed}
        variant="ic"
        cdcConfig={cdcConfig}
      />
      <BulkPrintContainer
        assessments={assessments}
        selectedIds={selectedPrintIds}
      />
    </div>
  );
}

ICCommandCenter.propTypes = {
  currentUser: PropTypes.object.isRequired,
  wards: PropTypes.array.isRequired,
  systemUsers: PropTypes.array.isRequired,
  cdcConfig: PropTypes.object.isRequired,
  assessments: PropTypes.array.isRequired,
  fetchGlobalData: PropTypes.func.isRequired,
  fetchAssessments: PropTypes.func.isRequired,
  setCdcConfig: PropTypes.func.isRequired,
  showToast: PropTypes.func.isRequired,
  systemCategories: PropTypes.array.isRequired,
  viewedCases: PropTypes.object.isRequired,
  markCaseAsViewed: PropTypes.func.isRequired,
  isCaseNew: PropTypes.func.isRequired,
  updateCurrentUser: PropTypes.func,
};
