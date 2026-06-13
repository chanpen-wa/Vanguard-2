import React, { useState, useEffect } from "react";
import {
  Layers,
  Type,
  CheckSquare,
  List,
  Calendar,
  AlertTriangle,
  Settings,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Columns,
  Code,
  LayoutTemplate,
  Palette,
  AlignLeft,
  BrainCircuit,
  GitMerge,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { DESIGNER_THEME_MAP } from "../constants/THEME_MAP";

export default function SchemaDesigner({ schema, onChange }) {
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [selectedSectionIdx, setSelectedSectionIdx] = useState(null);
  const [selectedPathIdx, setSelectedPathIdx] = useState(0);
  const [viewMode, setViewMode] = useState("designer");
  const [jsonTextEditor, setJsonTextEditor] = useState("");

  useEffect(() => {
    if (viewMode === "json") {
      setJsonTextEditor(JSON.stringify(schema, null, 2));
    }
  }, [viewMode, schema]);

  const FIELD_TOOLS = [
    {
      type: "text",
      label: "Text Input",
      icon: <Type className="w-4 h-4" />,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      type: "number",
      label: "Number Input",
      icon: <Type className="w-4 h-4" />,
      color: "bg-blue-50 text-blue-600 border-blue-200",
    },
    {
      type: "date",
      label: "Date Picker",
      icon: <Calendar className="w-4 h-4" />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-200",
    },
    {
      type: "checkbox",
      label: "Checkbox",
      icon: <CheckSquare className="w-4 h-4" />,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
    },
    {
      type: "radio_select",
      label: "Radio Select",
      icon: <List className="w-4 h-4" />,
      color: "bg-purple-50 text-purple-600 border-purple-200",
    },
    {
      type: "row",
      label: "Grid แนวนอน (Row)",
      icon: <Columns className="w-4 h-4" />,
      color: "bg-slate-100 text-slate-600 border-slate-300",
    },
    {
      type: "row_inline",
      label: "กลุ่มจัดเรียง (Inline)",
      icon: <AlignLeft className="w-4 h-4" />,
      color: "bg-slate-100 text-slate-600 border-slate-300",
    },
    {
      type: "alert",
      label: "Alert / Note",
      icon: <AlertTriangle className="w-4 h-4" />,
      color: "bg-amber-50 text-amber-600 border-amber-200",
    },
  ];

  if (!schema)
    return (
      <div className="p-8 text-center text-slate-500 font-bold">
        กรุณาเลือกหมวดหมู่ที่ต้องการแก้ไขด้านบน 👆
      </div>
    );

  const cloneSchema = () => JSON.parse(JSON.stringify(schema));

  const parseText = (text) => {
    if (!text) return "";
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return (
          <strong key={i} className="font-extrabold">
            {part.slice(2, -2)}
          </strong>
        );
      return <span key={i}>{part}</span>;
    });
  };

  const updateFieldById = (currentFields, targetId, updaterFn) => {
    for (let i = 0; i < currentFields.length; i++) {
      if (currentFields[i].id === targetId) {
        updaterFn(currentFields, i);
        return true;
      }
      if (currentFields[i].children) {
        if (updateFieldById(currentFields[i].children, targetId, updaterFn))
          return true;
      }
    }
    return false;
  };

  const modifySchemaField = (targetId, callback) => {
    const newSchema = cloneSchema();
    for (const sec of newSchema.sections || []) {
      if (updateFieldById(sec.fields || [], targetId, callback)) {
        onChange(newSchema);
        return newSchema;
      }
    }
  };

  const getSelectedFieldData = () => {
    let found = null;
    const findField = (fields) => {
      for (const f of fields) {
        if (f.id === selectedFieldId) found = f;
        if (f.children) findField(f.children);
      }
    };
    schema.sections?.forEach((s) => findField(s.fields || []));
    return found;
  };
  const activeField = getSelectedFieldData();
  const activeSection =
    selectedSectionIdx !== null ? schema.sections[selectedSectionIdx] : null;

  const getAllFieldIds = () => {
    const ids = [];
    const extract = (fields) => {
      fields.forEach((f) => {
        if (f.id && !["row", "row_inline", "alert"].includes(f.type))
          ids.push({ id: f.id, label: f.label || f.id });
        if (f.children) extract(f.children);
      });
    };
    schema.sections?.forEach((s) => extract(s.fields || []));
    return ids;
  };
  const availableFields = getAllFieldIds();

  // ==========================================
  // 🧠 Logic Tree Functions
  // ==========================================
  const handleUpdatePath = (key, value) => {
    const newSchema = cloneSchema();
    if (!newSchema.rules) newSchema.rules = { disease_paths: [] };
    if (!newSchema.rules.disease_paths[selectedPathIdx])
      newSchema.rules.disease_paths[selectedPathIdx] = {};
    newSchema.rules.disease_paths[selectedPathIdx][key] = value;
    onChange(newSchema);
  };

  const handleLogicNodeChange = (nodePath, newSubNode) => {
    const newSchema = cloneSchema();
    let current = newSchema.rules.disease_paths[selectedPathIdx].criteria;
    for (let i = 0; i < nodePath.length - 1; i++) {
      current = current[nodePath[i]];
    }
    current[nodePath[nodePath.length - 1]] = newSubNode;
    onChange(newSchema);
  };

  const handleDeleteLogicNode = (nodePath) => {
    const newSchema = cloneSchema();
    let current = newSchema.rules.disease_paths[selectedPathIdx].criteria;
    if (nodePath.length === 1) {
      current.splice(nodePath[0], 1);
    } else {
      for (let i = 0; i < nodePath.length - 2; i++) {
        current = current[nodePath[i]];
      }
      current[nodePath[nodePath.length - 2]].splice(
        nodePath[nodePath.length - 1],
        1,
      );
    }
    onChange(newSchema);
  };

  const handleAddLogicChild = (nodePath, parentType) => {
    const newSchema = cloneSchema();
    let current = newSchema.rules.disease_paths[selectedPathIdx].criteria;
    for (let i = 0; i < nodePath.length; i++) {
      current = current[nodePath[i]];
    }
    if (!current.conditions) current.conditions = [];
    current.conditions.push({
      type: "exact_match",
      field: availableFields[0]?.id || "",
      value: true,
      pass_message: "พบอาการใหม่",
    });
    onChange(newSchema);
  };

  // 🆕 Add Node Functions
  const addRootNode = (nodeType) => {
    const newSchema = cloneSchema();
    const path = newSchema.rules.disease_paths[selectedPathIdx];
    if (!path.criteria) path.criteria = [];

    const defaultNodes = {
      all_of: {
        type: "all_of",
        conditions: [],
        pass_message: "เข้าเกณฑ์ทุกข้อ (AND)",
      },
      any_of: {
        type: "any_of",
        conditions: [],
        pass_message: "เข้าเกณฑ์ข้อใดข้อหนึ่ง (OR)",
      },
      mandatory: {
        type: "mandatory",
        fields: [],
        pass_message: "ต้องมีอาการทั้งหมดที่ระบุ",
      },
      min_count: {
        type: "min_count",
        count: 1,
        fields: [],
        pass_message: "ต้องมีอย่างน้อย N ข้อ",
      },
      exact_match: {
        type: "exact_match",
        field: availableFields[0]?.id || "",
        value: true,
        pass_message: "ต้องตรงกับค่าที่ระบุ",
      },
    };

    path.criteria.push(defaultNodes[nodeType] || defaultNodes["all_of"]);
    onChange(newSchema);
  };

  // ==========================================
  // 🎨 Interactive Logic Tree Render
  // ==========================================
  const renderInteractiveLogicTree = (node, nodePath) => {
    if (!node) return null;

    const Wrapper = ({ children, color, icon, title, type }) => (
      <div
        className={`border-l-4 border-${color}-400 bg-${color}-50/40 p-4 rounded-xl mb-3 shadow-sm relative group`}
      >
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className={`font-extrabold text-sm text-${color}-800`}>
              {title}
            </span>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {["all_of", "any_of"].includes(type) && (
              <button
                onClick={() => handleAddLogicChild(nodePath, type)}
                className={`p-1.5 text-${color}-600 hover:bg-${color}-100 rounded-md`}
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleDeleteLogicNode(nodePath)}
              className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-md"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {children}
      </div>
    );

    // AND / OR
    if (node.type === "any_of" || node.type === "all_of") {
      const color = node.type === "any_of" ? "emerald" : "indigo";
      const icon =
        node.type === "any_of" ? (
          <GitMerge className={`w-4 h-4 text-${color}-600`} />
        ) : (
          <Layers className={`w-4 h-4 text-${color}-600`} />
        );
      const title =
        node.type === "any_of"
          ? 'เข้าเกณฑ์ "ข้อใดข้อหนึ่ง" (OR)'
          : 'ต้องเข้าเกณฑ์ "ทุกข้อ" (AND)';
      return (
        <Wrapper
          color={color}
          icon={icon}
          title={title}
          type={node.type}
          key={nodePath.join("-")}
        >
          <div className="pl-4 space-y-2 border-l-2 border-dashed border-slate-300 ml-2">
            {node.conditions?.map((child, i) =>
              renderInteractiveLogicTree(child, [...nodePath, "conditions", i]),
            )}
          </div>
          <div className="mt-3">
            <input
              type="text"
              placeholder="ข้อความเมื่อผ่านเกณฑ์ (Pass Message)"
              value={node.pass_message || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  pass_message: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
            />
          </div>
        </Wrapper>
      );
    }

    // 🆕 Mandatory
    if (node.type === "mandatory") {
      return (
        <Wrapper
          color="rose"
          icon={<CheckCircle2 className="w-4 h-4 text-rose-500" />}
          title="บังคับต้องมี (Mandatory)"
          type={node.type}
          key={nodePath.join("-")}
        >
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600">
              Field IDs (คั่นด้วยลูกน้ำ):
            </label>
            <input
              type="text"
              value={node.fields?.join(",") || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  fields: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
              placeholder="fever_adult, chills, hypotension"
            />
            <label className="text-xs font-bold text-slate-600 mt-2">
              ข้อความเมื่อผ่าน:
            </label>
            <input
              type="text"
              value={node.pass_message || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  pass_message: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
              placeholder="พบอาการที่ระบุครบทุกข้อ"
            />
          </div>
        </Wrapper>
      );
    }

    // 🆕 Min Count
    if (node.type === "min_count") {
      return (
        <Wrapper
          color="amber"
          icon={<List className="w-4 h-4 text-amber-500" />}
          title="จำนวนขั้นต่ำ (Min Count)"
          type={node.type}
          key={nodePath.join("-")}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                ต้องมีอย่างน้อย:
              </span>
              <input
                type="number"
                min="1"
                value={node.count || 1}
                onChange={(e) =>
                  handleLogicNodeChange(nodePath, {
                    ...node,
                    count: parseInt(e.target.value),
                  })
                }
                className="w-16 px-2 py-1 text-xs border rounded outline-none"
              />
              <span className="text-xs text-slate-600">ข้อ จาก:</span>
            </div>
            <input
              type="text"
              value={node.fields?.join(",") || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  fields: e.target.value.split(",").map((s) => s.trim()),
                })
              }
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
              placeholder="fever_adult, chills, hypotension"
            />
            <input
              type="text"
              placeholder="ข้อความเมื่อผ่าน"
              value={node.pass_message || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  pass_message: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white mt-2"
            />
          </div>
        </Wrapper>
      );
    }

    // 🆕 Exact Match
    if (node.type === "exact_match") {
      return (
        <Wrapper
          color="blue"
          icon={<ShieldAlert className="w-4 h-4 text-blue-500" />}
          title="ตรวจค่าเป๊ะๆ (Exact Match)"
          type={node.type}
          key={nodePath.join("-")}
        >
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <select
                value={node.field || ""}
                onChange={(e) =>
                  handleLogicNodeChange(nodePath, {
                    ...node,
                    field: e.target.value,
                  })
                }
                className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
              >
                <option value="">-- เลือกฟิลด์ --</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.id})
                  </option>
                ))}
              </select>
              <select
                value={
                  node.value === true
                    ? "true"
                    : node.value === false
                      ? "false"
                      : node.value
                }
                onChange={(e) => {
                  let val = e.target.value;
                  if (val === "true") val = true;
                  if (val === "false") val = false;
                  handleLogicNodeChange(nodePath, { ...node, value: val });
                }}
                className="w-24 px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white font-mono"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </div>
            <input
              type="text"
              placeholder="ข้อความเมื่อผ่านเกณฑ์ (Pass Message)"
              value={node.pass_message || ""}
              onChange={(e) =>
                handleLogicNodeChange(nodePath, {
                  ...node,
                  pass_message: e.target.value,
                })
              }
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white"
            />
          </div>
        </Wrapper>
      );
    }

    return null;
  };

  // ==========================================
  // 🔗 Dependency Check
  // ==========================================
  const checkDependency = (currSchema, fieldId) => {
    const dependencies = [];
    const findInLogic = (node) => {
      if (node.field === fieldId)
        dependencies.push(
          "AI Logic: " + (node.pass_message || "เงื่อนไขตรวจอาการ"),
        );
      if (node.fields && node.fields.includes(fieldId))
        dependencies.push("AI Logic: ตรวจสอบกลุ่มฟิลด์");
      if (node.conditions) node.conditions.forEach(findInLogic);
    };
    currSchema.rules?.disease_paths?.forEach((path) => {
      if (path.device_field === fieldId)
        dependencies.push("AI Logic: อุปกรณ์หลักของ " + path.base_disease);
      if (path.criteria) path.criteria.forEach(findInLogic);
    });
    return dependencies;
  };

  // ==========================================
  // 🎨 WYSIWYG Functions
  // ==========================================
  const createNewFieldObj = (toolType) => {
    const newField = {
      id: `${toolType}_${Math.floor(Math.random() * 10000)}`,
      type: toolType,
    };
    if (["row", "row_inline"].includes(toolType)) {
      newField.children = [];
      return newField;
    }
    if (toolType === "alert") {
      newField.text = "ระบุข้อความแจ้งเตือน";
      newField.theme = "amber";
      return newField;
    }
    newField.label = `ฟิลด์ ${toolType} ใหม่`;
    if (toolType === "radio_select")
      newField.options = [
        { label: "ตัวเลือก 1", value: "opt1" },
        { label: "ตัวเลือก 2", value: "opt2" },
      ];
    return newField;
  };
  const handleAddSection = () => {
    const newSchema = cloneSchema();
    if (!newSchema.sections) newSchema.sections = [];
    newSchema.sections.push({
      id: `sec_${Date.now()}`,
      title: "หมวดหมู่ใหม่",
      theme: "blue",
      fields: [],
    });
    onChange(newSchema);
    setSelectedFieldId(null);
    setSelectedSectionIdx(newSchema.sections.length - 1);
  };
  const handleDropToSection = (e, sIdx) => {
    e.preventDefault();
    const toolType = e.dataTransfer.getData("toolType");
    if (!toolType) return;
    const newSchema = cloneSchema();
    if (!newSchema.sections[sIdx].fields) newSchema.sections[sIdx].fields = [];
    const newField = createNewFieldObj(toolType);
    newSchema.sections[sIdx].fields.push(newField);
    onChange(newSchema);
    setSelectedSectionIdx(null);
    setSelectedFieldId(newField.id);
  };
  const handleDropToField = (e, targetFieldId) => {
    e.preventDefault();
    e.stopPropagation();
    const toolType = e.dataTransfer.getData("toolType");
    if (!toolType) return;
    modifySchemaField(targetFieldId, (arr, idx) => {
      if (!arr[idx].children) arr[idx].children = [];
      const newField = createNewFieldObj(toolType);
      arr[idx].children.push(newField);
      setSelectedSectionIdx(null);
      setSelectedFieldId(newField.id);
    });
  };
  const handleMoveField = (id, direction, e) => {
    e.stopPropagation();
    modifySchemaField(id, (arr, idx) => {
      if (direction === "up" && idx > 0) {
        const temp = arr[idx];
        arr[idx] = arr[idx - 1];
        arr[idx - 1] = temp;
      }
      if (direction === "down" && idx < arr.length - 1) {
        const temp = arr[idx];
        arr[idx] = arr[idx + 1];
        arr[idx + 1] = temp;
      }
    });
  };

  const handleDeleteField = (id, e) => {
    e.stopPropagation();
    const dependencies = checkDependency(schema, id);
    if (dependencies.length > 0) {
      alert(
        `⚠️ ไม่สามารถลบฟิลด์นี้ได้!\nฟิลด์นี้ถูกใช้งานอยู่ใน:\n- ${dependencies.join("\n- ")}\n\nโปรดลบเงื่อนไขในแท็บ "AI Logic Rules" ออกก่อนครับ`,
      );
      return;
    }
    modifySchemaField(id, (arr, idx) => {
      arr.splice(idx, 1);
    });
    setSelectedFieldId(null);
  };

  const renderWYSIWYG = (field, level = 0) => {
    const isSelected = selectedFieldId === field.id;
    const highlightClass = isSelected
      ? "ring-2 ring-indigo-400 border-indigo-400 bg-indigo-50/20 z-10"
      : "border-slate-200 hover:border-indigo-200";
    const baseWrapper = `relative p-4 mb-3 border rounded-2xl transition-all cursor-pointer shadow-sm group ${highlightClass} ${["row", "row_inline"].includes(field.type) ? "bg-slate-50/50" : "bg-white"}`;

    const renderControls = () => (
      <div
        className={`absolute -top-3 -right-2 flex gap-1 ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"} transition-opacity bg-white shadow-md rounded-lg p-1 border border-slate-200 z-20`}
      >
        <button
          onClick={(e) => handleMoveField(field.id, "up", e)}
          className="p-1 hover:bg-slate-100 text-slate-500 rounded"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleMoveField(field.id, "down", e)}
          className="p-1 hover:bg-slate-100 text-slate-500 rounded"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => handleDeleteField(field.id, e)}
          className="p-1 hover:bg-rose-100 text-rose-500 rounded"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );

    if (field.type === "alert") {
      const t = DESIGNER_THEME_MAP[field.theme] || DESIGNER_THEME_MAP.amber;
      return (
        <div
          key={field.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSectionIdx(null);
            setSelectedFieldId(field.id);
          }}
          className={`${baseWrapper} ${t.wrapper} ${t.header} flex items-start gap-2 p-3 rounded-xl`}
        >
          {" "}
          {renderControls()}{" "}
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 opacity-70" />{" "}
          <div className="text-sm font-medium">
            {parseText(field.text)}
          </div>{" "}
        </div>
      );
    }
    if (field.type === "row" || field.type === "row_inline") {
      return (
        <div
          key={field.id}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedSectionIdx(null);
            setSelectedFieldId(field.id);
          }}
          className={baseWrapper}
        >
          {" "}
          {renderControls()}{" "}
          <div className="absolute -top-2.5 left-4 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
            {" "}
            {field.type === "row" ? (
              <Columns className="w-3 h-3" />
            ) : (
              <AlignLeft className="w-3 h-3" />
            )}{" "}
            {field.type === "row" ? "Grid แนวนอน" : "Inline Group"}{" "}
          </div>{" "}
          <div
            className={
              field.type === "row"
                ? "grid grid-cols-1 md:grid-cols-2 gap-4 pt-3"
                : "flex flex-wrap gap-x-6 gap-y-3 pt-3"
            }
          >
            {" "}
            {field.children?.map((c) => renderWYSIWYG(c, level + 1))}{" "}
          </div>{" "}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDropToField(e, field.id)}
            className="mt-3 border-2 border-dashed border-slate-200 rounded-xl p-3 text-center text-slate-400 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-bold transition-colors"
          >
            {" "}
            + ลากฟิลด์มาวางใน Group นี้{" "}
          </div>{" "}
        </div>
      );
    }

    return (
      <div
        key={field.id}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedSectionIdx(null);
          setSelectedFieldId(field.id);
        }}
        className={baseWrapper}
      >
        {renderControls()}
        {field.type === "checkbox" && (
          <div className="flex items-start gap-3 pointer-events-none">
            {" "}
            <input
              type="checkbox"
              readOnly
              checked={false}
              className="w-5 h-5 rounded-md mt-0.5 border-slate-300 text-slate-800"
            />{" "}
            <div className="flex flex-col">
              {" "}
              <span className="font-semibold text-sm text-slate-900 leading-tight">
                {parseText(field.label)}
              </span>{" "}
              {field.description && (
                <span className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {field.description}
                </span>
              )}{" "}
            </div>{" "}
          </div>
        )}
        {["text", "number", "date"].includes(field.type) && (
          <div className="w-full md:w-2/3 pointer-events-none">
            {" "}
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {parseText(field.label)}
            </label>{" "}
            <input
              type={field.type}
              readOnly
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              placeholder={field.placeholder || "..."}
            />{" "}
          </div>
        )}
        {field.type === "radio_select" && (
          <div className="w-full pointer-events-none">
            {" "}
            <div className="flex flex-col gap-2.5">
              {" "}
              {field.options?.map((opt, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3 border border-slate-200 rounded-2xl bg-white"
                >
                  <div className="w-4 h-4 rounded-full border border-slate-300"></div>
                  <span className="text-sm text-slate-600">{opt.label}</span>
                </div>
              ))}{" "}
            </div>{" "}
          </div>
        )}
        {field.type === "checkbox" && (
          <div className="mt-4 pl-8 border-l-2 border-slate-100">
            {" "}
            {field.children?.map((c) => renderWYSIWYG(c, level + 1))}{" "}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropToField(e, field.id)}
              className="border-2 border-dashed border-slate-200 rounded-xl p-3 text-center text-slate-400 hover:bg-indigo-50 hover:border-indigo-300 text-xs font-bold transition-colors"
            >
              {" "}
              + ลากฟิลด์ย่อย (Sub-field) มาวางที่นี่{" "}
            </div>{" "}
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // 🖥️ Main Render
  // ==========================================
  return (
    <div className="flex flex-col h-full overflow-hidden text-slate-800 bg-slate-50">
      {/* View Mode Tabs */}
      <div className="flex justify-center p-3 bg-white border-b border-slate-200 shadow-sm z-20">
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
          <button
            onClick={() => setViewMode("designer")}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === "designer" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            <LayoutTemplate className="w-4 h-4" /> UI Designer
          </button>
          <button
            onClick={() => setViewMode("logic")}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === "logic" ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            <BrainCircuit className="w-4 h-4" /> AI Logic Rules
          </button>
          <button
            onClick={() => setViewMode("json")}
            className={`px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === "json" ? "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Code className="w-4 h-4" /> JSON Data
          </button>
        </div>
      </div>

      {/* JSON View */}
      {viewMode === "json" && (
        <div className="flex-1 p-6 bg-[#0F172A]">
          <textarea
            value={jsonTextEditor}
            onChange={(e) => {
              setJsonTextEditor(e.target.value);
              try {
                const parsed = JSON.parse(e.target.value);
                onChange(parsed);
              } catch (err) {}
            }}
            className="w-full h-full bg-transparent text-teal-400 font-mono text-sm resize-none outline-none leading-relaxed custom-scrollbar"
          />
        </div>
      )}

      {/* Logic View */}
      {viewMode === "logic" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Disease Paths Sidebar */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
            <div className="p-4 border-b border-slate-100 bg-emerald-50/30">
              <h4 className="font-extrabold text-sm flex items-center gap-2 text-emerald-800">
                <BrainCircuit className="w-4 h-4" /> Disease Paths
              </h4>
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                เลือกเส้นทางการวินิจฉัยเพื่อตั้งค่า
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {schema.rules?.disease_paths?.map((path, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPathIdx(idx)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedPathIdx === idx ? "bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100" : "bg-white border-slate-200 hover:border-emerald-200"}`}
                >
                  <p className="font-bold text-sm text-slate-800">
                    {path.base_disease || "Unnamed Path"}
                  </p>
                  {path.device_disease && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">
                      ↳ Upgrade: {path.device_disease}
                    </p>
                  )}
                </button>
              ))}
              <button
                onClick={() => {
                  const newSchema = cloneSchema();
                  if (!newSchema.rules) newSchema.rules = { disease_paths: [] };
                  newSchema.rules.disease_paths.push({
                    base_disease: "New Path",
                    criteria: [],
                  });
                  onChange(newSchema);
                  setSelectedPathIdx(newSchema.rules.disease_paths.length - 1);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-500 hover:text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> สร้าง Path ใหม่
              </button>
            </div>
          </div>

          {/* Logic Tree */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50/50 custom-scrollbar">
            {schema.rules?.disease_paths?.[selectedPathIdx] ? (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Target Config */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <h3 className="text-lg font-extrabold text-slate-800 border-b border-slate-100 pb-3 mb-5">
                    ตั้งค่าเป้าหมาย (Target)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                        Base Disease *
                      </label>
                      <input
                        type="text"
                        value={
                          schema.rules.disease_paths[selectedPathIdx]
                            .base_disease || ""
                        }
                        onChange={(e) =>
                          handleUpdatePath("base_disease", e.target.value)
                        }
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-400"
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-rose-50/50 border border-rose-100 rounded-xl">
                      <div>
                        <label className="block text-[10px] font-bold text-rose-600 mb-2 uppercase">
                          Device Field
                        </label>
                        <select
                          value={
                            schema.rules.disease_paths[selectedPathIdx]
                              .device_field || ""
                          }
                          onChange={(e) =>
                            handleUpdatePath("device_field", e.target.value)
                          }
                          className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm font-medium outline-none focus:border-rose-400"
                        >
                          <option value="">-- ไม่ใช้อุปกรณ์ --</option>
                          {availableFields.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label} ({f.id})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-rose-600 mb-2 uppercase">
                          Upgrade To
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น CLABSI, VAP"
                          value={
                            schema.rules.disease_paths[selectedPathIdx]
                              .device_disease || ""
                          }
                          onChange={(e) =>
                            handleUpdatePath("device_disease", e.target.value)
                          }
                          className="w-full px-4 py-2.5 bg-white border border-rose-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Criteria Tree */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                    <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" /> Logic
                      Criteria Tree
                    </h3>
                    {/* 🆕 All Node Type Buttons */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => addRootNode("all_of")}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg text-xs font-bold hover:bg-indigo-100 flex items-center gap-1"
                      >
                        + AND
                      </button>
                      <button
                        onClick={() => addRootNode("any_of")}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100 flex items-center gap-1"
                      >
                        + OR
                      </button>
                      <button
                        onClick={() => addRootNode("mandatory")}
                        className="px-3 py-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 flex items-center gap-1"
                      >
                        + Mandatory
                      </button>
                      <button
                        onClick={() => addRootNode("min_count")}
                        className="px-3 py-1.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 flex items-center gap-1"
                      >
                        + Min Count
                      </button>
                      <button
                        onClick={() => addRootNode("exact_match")}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1"
                      >
                        + Exact Match
                      </button>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                    {schema.rules.disease_paths[selectedPathIdx].criteria?.map(
                      (node, i) => renderInteractiveLogicTree(node, [i]),
                    )}
                    {(!schema.rules.disease_paths[selectedPathIdx].criteria ||
                      schema.rules.disease_paths[selectedPathIdx].criteria
                        .length === 0) && (
                      <p className="text-sm text-slate-400 font-medium text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                        กดปุ่ม + ด้านบนเพื่อเริ่มสร้างเงื่อนไข AI
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                เลือก Disease Path ด้านซ้ายมือเพื่อตั้งค่า
              </div>
            )}
          </div>
        </div>
      )}

      {/* Designer View */}
      {viewMode === "designer" && (
        <div className="flex-1 flex overflow-hidden">
          {/* Tools Panel */}
          <div className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-extrabold text-sm flex items-center gap-2 text-slate-800">
                <Layers className="w-4 h-4 text-indigo-500" /> Form Elements
              </h4>
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium leading-relaxed">
                คลิกค้างแล้วลาก (Drag) ไปปล่อยตรงกลาง
              </p>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {FIELD_TOOLS.map((tool) => (
                <div
                  key={tool.type}
                  draggable
                  onDragStart={(e) =>
                    e.dataTransfer.setData("toolType", tool.type)
                  }
                  onClick={() => {
                    const newSchema = cloneSchema();
                    if (!newSchema.sections)
                      newSchema.sections = [
                        {
                          id: `sec_${Date.now()}`,
                          title: "Section",
                          fields: [],
                        },
                      ];
                    newSchema.sections[
                      newSchema.sections.length - 1
                    ].fields.push(createNewFieldObj(tool.type));
                    onChange(newSchema);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border hover:shadow-md transition-all active:scale-95 cursor-grab ${tool.color}`}
                >
                  <div className="bg-white p-1.5 rounded-lg shadow-sm">
                    {tool.icon}
                  </div>
                  <span className="font-bold text-xs">{tool.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar relative bg-slate-100/50">
            <div className="max-w-3xl mx-auto space-y-6 pb-20">
              <div className="mb-6">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {schema.name || "ยังไม่มีชื่อหมวดหมู่"}
                </h2>
                <p className="text-sm font-mono text-slate-500 mt-2 bg-white px-3 py-1 rounded-md border inline-block shadow-sm">
                  ID: {schema.system_id}
                </p>
              </div>
              {schema.sections?.map((section, sIdx) => {
                const theme =
                  DESIGNER_THEME_MAP[section.theme] || DESIGNER_THEME_MAP.blue;
                return (
                  <div
                    key={section.id}
                    className={`bg-white border rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md mb-6 ${theme.wrapper} ${selectedSectionIdx === sIdx ? "ring-2 ring-indigo-400 border-indigo-400" : ""}`}
                  >
                    <div
                      onClick={() => {
                        setSelectedFieldId(null);
                        setSelectedSectionIdx(sIdx);
                      }}
                      className={`p-5 border-b border-white/40 flex justify-between items-center group cursor-pointer`}
                    >
                      <div className="flex items-center gap-3 w-3/4 pointer-events-none">
                        <div
                          className={`w-3 h-3 rounded-full ${theme.dot} shadow-sm shrink-0`}
                        ></div>
                        <span
                          className={`font-extrabold text-lg ${theme.header}`}
                        >
                          {section.title}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!window.confirm("ลบ Section?")) return;
                          const newSchema = cloneSchema();
                          newSchema.sections.splice(sIdx, 1);
                          onChange(newSchema);
                          setSelectedSectionIdx(null);
                        }}
                        className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {section.description && (
                      <div className="px-6 pt-4 pb-0 text-xs text-slate-600 font-medium whitespace-pre-line leading-relaxed">
                        {section.description}
                      </div>
                    )}
                    <div className="p-6">
                      {section.fields?.map((field) => renderWYSIWYG(field, 0))}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDropToSection(e, sIdx)}
                        className="mt-4 border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer shadow-sm"
                      >
                        <Plus className="w-6 h-6 mb-2 opacity-50" />
                        <span className="font-bold text-sm">
                          ลากเครื่องมือมาวางที่นี่
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={handleAddSection}
                className="w-full py-5 border-2 border-dashed border-slate-300 rounded-3xl text-sm font-extrabold text-slate-500 hover:text-slate-800 hover:border-slate-400 hover:bg-white transition-all flex items-center justify-center gap-2 shadow-sm bg-slate-50/50"
              >
                <Plus className="w-5 h-5" /> เพิ่ม Section หมวดหมู่ใหม่
              </button>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="w-[340px] bg-white border-l border-slate-200 flex flex-col z-10 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-extrabold text-sm flex items-center gap-2 text-slate-800">
                <Settings className="w-4 h-4 text-indigo-500" /> Properties
              </h4>
            </div>
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
              {activeSection && !activeField ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-10">
                  <div className="p-4 bg-slate-100 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-200">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm text-slate-600">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                        Edit Section
                      </p>
                      <p className="text-base font-extrabold text-slate-800">
                        หมวดหมู่
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                        Section Title *
                      </label>
                      <input
                        type="text"
                        value={activeSection.title || ""}
                        onChange={(e) => {
                          const newSchema = cloneSchema();
                          newSchema.sections[selectedSectionIdx].title =
                            e.target.value;
                          onChange(newSchema);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:bg-white focus:border-indigo-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                        Description
                      </label>
                      <textarea
                        rows="3"
                        value={activeSection.description || ""}
                        onChange={(e) => {
                          const newSchema = cloneSchema();
                          newSchema.sections[selectedSectionIdx].description =
                            e.target.value;
                          onChange(newSchema);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-indigo-400 resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                        Theme Color
                      </label>
                      <select
                        value={activeSection.theme || "blue"}
                        onChange={(e) => {
                          const newSchema = cloneSchema();
                          newSchema.sections[selectedSectionIdx].theme =
                            e.target.value;
                          onChange(newSchema);
                        }}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                      >
                        <option value="blue">🔵 สีฟ้า</option>
                        <option value="yellow">🟡 สีเหลือง</option>
                        <option value="red">🔴 สีแดง</option>
                        <option value="purple">🟣 สีม่วง</option>
                        <option value="orange">🟠 สีส้ม</option>
                        <option value="amber">🍯 สีอำพัน</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : activeField ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-10">
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-4 shadow-sm">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm text-indigo-600">
                      {FIELD_TOOLS.find((t) => t.type === activeField.type)
                        ?.icon || <Type className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                        Field Type
                      </p>
                      <p className="text-base font-extrabold text-indigo-900">
                        {activeField.type}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                        Field ID *
                      </label>
                      <input
                        type="text"
                        value={activeField.id || ""}
                        onChange={(e) =>
                          modifySchemaField(
                            activeField.id,
                            (arr, i) => (arr[i].id = e.target.value),
                          )
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:bg-white focus:border-indigo-400 text-slate-800"
                      />
                    </div>
                    {activeField.type !== "alert" &&
                      activeField.type !== "row" &&
                      activeField.type !== "row_inline" && (
                        <div>
                          <div className="flex justify-between items-end mb-2">
                            <label className="block text-xs font-extrabold text-slate-600 uppercase">
                              Label *
                            </label>
                          </div>
                          <textarea
                            rows="3"
                            value={activeField.label || ""}
                            onChange={(e) =>
                              modifySchemaField(
                                activeField.id,
                                (arr, i) => (arr[i].label = e.target.value),
                              )
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-400 resize-none"
                          />
                        </div>
                      )}
                    {activeField.type === "alert" && (
                      <div>
                        <label className="block text-xs font-extrabold text-amber-700 uppercase mb-2">
                          Alert Message *
                        </label>
                        <textarea
                          rows="3"
                          value={activeField.text || ""}
                          onChange={(e) =>
                            modifySchemaField(
                              activeField.id,
                              (arr, i) => (arr[i].text = e.target.value),
                            )
                          }
                          className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-amber-400 resize-none text-amber-900"
                        />
                        <label className="block text-xs font-extrabold text-slate-600 mt-4 mb-2 uppercase">
                          Alert Theme
                        </label>
                        <select
                          value={activeField.theme || "amber"}
                          onChange={(e) =>
                            modifySchemaField(
                              activeField.id,
                              (arr, i) => (arr[i].theme = e.target.value),
                            )
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                        >
                          <option value="amber">สีส้ม</option>
                          <option value="blue">สีฟ้า</option>
                          <option value="red">สีแดง</option>
                          <option value="purple">สีม่วง</option>
                        </select>
                      </div>
                    )}
                    {activeField.type !== "row" &&
                      activeField.type !== "row_inline" && (
                        <div>
                          <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                            Description
                          </label>
                          <textarea
                            rows="2"
                            value={activeField.description || ""}
                            onChange={(e) =>
                              modifySchemaField(
                                activeField.id,
                                (arr, i) =>
                                  (arr[i].description = e.target.value),
                              )
                            }
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:bg-white focus:border-indigo-400 resize-none"
                          />
                        </div>
                      )}
                    {["text", "number", "date"].includes(activeField.type) && (
                      <div>
                        <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                          Placeholder
                        </label>
                        <input
                          type="text"
                          value={activeField.placeholder || ""}
                          onChange={(e) =>
                            modifySchemaField(
                              activeField.id,
                              (arr, i) => (arr[i].placeholder = e.target.value),
                            )
                          }
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:bg-white focus:border-indigo-400"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 mb-2 uppercase">
                        Target Age
                      </label>
                      <select
                        value={activeField.target_age || "all"}
                        onChange={(e) =>
                          modifySchemaField(
                            activeField.id,
                            (arr, i) => (arr[i].target_age = e.target.value),
                          )
                        }
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-400"
                      >
                        <option value="all">ทุกคน</option>
                        <option value="adult">ผู้ใหญ่</option>
                        <option value="infant">ทารก</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-40 space-y-4">
                  <Palette className="w-10 h-10 text-slate-400" />
                  <p className="text-sm font-bold text-slate-500">
                    คลิกที่ฟิลด์ตรงกลาง
                    <br />
                    เพื่อตั้งค่าคุณสมบัติ
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
