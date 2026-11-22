/**
 * =========================================================================
 * PANI GOLD PROJECT - L&D DASHBOARD API (READ-ONLY)
 * =========================================================================
 * Satu-satunya backend dashboard. Hanya membaca data dari Google Sheets.
 *
 * CARA PASANG / UPDATE:
 * 1. Buka Spreadsheet > Ekstensi > Apps Script.
 * 2. Hapus semua kode lama, tempel seluruh file ini, lalu Simpan (Ctrl+S).
 * 3. Terapkan > Kelola penerapan > (ikon pensil di penerapan aktif) >
 *    Versi: "Versi baru" > Terapkan.
 *    (URL Web App tetap sama, tidak berubah!)
 *
 * FITUR TERBARU:
 * - Membaca manpower_internal dan manpower_mitra / manpower_external sebagai sumber terpisah
 * - Permintaan ?sheet=manpower akan otomatis menggabungkan kedua tab tersebut
 *   dengan kolom entity otomatis ("Organik MDKA" & "Labour Supply")
 * - Mendukung akses individual ?sheet=manpower_internal dan ?sheet=manpower_mitra
 * - Mendukung tab aktivitas trainer ?sheet=trainerActivity
 *
 * PERBAIKAN v2:
 * - ?sheet=all (atau ?sheets=a,b,c) -> SEMUA tab dalam 1 request (jauh lebih cepat
 *   daripada 12 request terpisah). Spreadsheet hanya dibuka 1x.
 * - Cache server (CacheService, 2 menit). Tambah &nocache=1 untuk paksa baca ulang.
 * - Tanggal teks "dd-MM-yyyy" / "dd/MM/yyyy" otomatis jadi "yyyy-MM-dd".
 * - Deteksi baris header otomatis (tahan baris judul / baris kosong di atas header).
 * - Perbaikan bentrok alias (mis. kolom "Status" tidak lagi salah petak).
 * - Spasi ganda / spasi tak terlihat dirapikan; label kategori diseragamkan.
 * - ?action=check -> kualitas data, header yang belum dipetakan, dan baris sumber yang terlewat.
 *
 * PERUBAHAN TERBARU:
 * - trainingRealization: kolom section & company kini dipetakan (sebelumnya dibuang).
 * - Tab realtimeAssesment TIDAK lagi dibaca sebagai assessmentResults
 *   (isinya daftar pelatihan yang sudah dinilai, bukan skor ujian).
 * - Versi cache server dinaikkan agar skema baru langsung berlaku.
 * - Tab IMPORTRANGE/QUERY yang masih "Loading..." ditunggu (maks. 5 dtk per permintaan), ditandai
 *   importPending, dan payload kosong tidak disimpan ke cache server.
 *
 * ENDPOINT:
 *   ?action=ping          -> daftar tab terdeteksi + jumlah baris
 *   ?action=check         -> laporan kualitas data + rekomendasi perbaikan spreadsheet
 *   ?sheet=<kunci>        -> satu tab, format ringkas {headers, rows}
 *   ?sheet=all            -> semua tab utama sekaligus {payloads:{kunci:{...}}}
 */

const SPREADSHEET_ID = '1RE8UpWaGAL_PHEuP0PguZlUkFR9AA4cF_n44GJ-ghr4';
const CACHE_SECONDS = 120;          // lama cache server (detik)
const CACHE_CHUNK = 90000;          // batas aman CacheService per kunci (~100KB)
// Manpower dibaca per sumber; endpoint gabungan tetap tersedia untuk kompatibilitas.
const BATCH_KEYS = ['trainingRealization', 'trainingBudget', 'manpower', 'manpowerInternal', 'manpowerMitra', 'competencyList',
  'miningEngineeringOperators', 'interviewRecap', 'jobStandards', 'jobCompetencyStandards',
  'assessmentResults', 'simulatorResults', 'trainerActivity', 'summary', 'schedule'];

const SCHEMA = {
  trainingRealization: {
    tabs: ['trainingRealization', 'realisasiPelatihan', 'REALISASI_TRAINING_MANPOWER', 'Realisasi Pelatihan'],
    fields: {
      employeeId: ['employeeId', 'ID Employee', 'ID_Employee', 'ID Karyawan', 'NRP', 'NIK'],
      employeeName: ['employeeName', 'Employee Name', 'Nama Karyawan', 'Nama'],
      position: ['position', 'Position Title', 'Position', 'Job Title', 'Jabatan'],
      level: ['level', 'Level', 'Jenjang'],
      department: ['department', 'Departement', 'Department', 'Divisi'],
      section: ['section', 'Section', 'Seksi'],
      company: ['company', 'Company', 'Perusahaan', 'PT'],
      competencyTrainingTopic: ['competencyTrainingTopic', 'Training Topic / Competency Topic', 'Training Topic', 'Competency Topic', 'Nama Training'],
      trainingDate: ['trainingDate', 'Training Date', 'Tanggal Training', 'Tanggal'],
      competencyType: ['competencyType', 'JENIS KOMPETENSI', 'Jenis Kompetensi', 'Competency Type'],
      trainingCode: ['trainingCode', 'Training Code', 'Kode Training', 'Kode'],
      trainerName: ['trainerName', 'Trainer Name', 'Nama Trainer', 'Trainer', 'Instructor', 'Instruktur', 'Nama Pengajar'],
      completionStatus: ['completionStatus', 'Training Status', 'Completion Status', 'Status Training', 'Status Pelatihan', 'Status', 'Hasil Training', 'Training Result'],
      employeeStatus: ['employeeStatus', 'Manpower Status', 'Employee Status', 'Status Employee'],
      trainingCategory: ['trainingCategory', 'JENIS TRAINING', 'Training Category', 'Kategori']
    }
  },
  trainingBudget: {
    tabs: ['trainingBudget', 'anggaranPelatihan', 'Training_Budget', 'Training Budget'],
    fields: {
      year: ['year', 'Tahun'],
      no: ['no', 'NO', 'No'],
      entity: ['entity', 'ENTITY', 'Entity', 'Entitas'],
      employeeId: ['employeeId', 'EMPLOYEE ID', 'ID Employee', 'NRP'],
      employeeName: ['employeeName', 'EMPLOYEE NAME', 'Nama Karyawan'],
      divisionDepartment: ['divisionDepartment', 'DIVISION/DEPARTMENT', 'Department', 'Divisi'],
      position: ['position', 'POSITION TITLE', 'Position', 'Jabatan'],
      supervisorName: ['supervisorName', 'SUPERVISOR NAME', 'Supervisor'],
      code: ['code', 'Code', 'Kode'],
      topicTitle: ['topicTitle', 'TITLE/TOPIC', 'Title', 'Topic', 'Nama Training'],
      sector: ['sector', 'SECTOR', 'Sektor'],
      category: ['category', 'CATEGORY', 'Kategori'],
      type: ['type', 'TYPE', 'Tipe'],
      schedulePlan: ['schedulePlan', 'SCHEDULE PLAN', 'Jadwal'],
      justification: ['justification', 'JUSTIFICATION', 'Justifikasi'],
      hoCost: ['hoCost', 'COST FROM HO', 'Biaya HO', 'Cost HO'],
      siteBudgetReview: ['siteBudgetReview', 'REVIEW BUDGET LND SITE', 'Budget Review'],
      variance: ['variance', 'SELISIH', 'Variance'],
      remarks: ['remarks', 'REMARKS', 'Keterangan']
    }
  },
  manpower: {
    tabs: ['MANPOWER', 'manpower', 'tenagaKerja', 'Tenaga Kerja'],
    fields: {
      status: ['status', 'Status', 'Employee Status', 'Status Kerja'],
      employeeName: ['employeeName', 'Employee Name', 'Nama Karyawan', 'Nama'],
      employeeId: ['employeeId', 'idEmployee', 'ID Employee', 'Employee ID', 'ID_Karyawan', 'ID Karyawan', 'NRP', 'NIK'],
      position: ['position', 'positionTitle', 'Position Title', 'Position', 'Job Title', 'Jabatan'],
      level: ['level', 'Level', 'Jenjang', 'Golongan'],
      department: ['department', 'Department', 'Departement', 'Divisi'],
      section: ['section', 'Section', 'Seksi'],
      company: ['company', 'Company', 'Perusahaan', 'PT'],
      entity: ['entity', 'Entity', 'Entitas', 'Status Karyawan'],
      hireDate: ['hireDate', 'dateOfHire', 'Date Of Hire', 'Hire Date', 'Tanggal Masuk', 'Tgl Masuk'],
      additionDate: ['additionDate', 'addDate', 'Add Date', 'Tanggal Tambah']
    }
  },
  manpowerInternal: {
    tabs: ['manpower_internal', 'tenagaKerjaInternal', 'MANPOWER_INTERNAL', 'manpower internal', 'Manpower Internal', 'Internal'],
    fields: {
      status: ['status', 'Status', 'Employee Status', 'Status Kerja'],
      employeeName: ['employeeName', 'Employee Name', 'Nama Karyawan', 'Nama'],
      employeeId: ['employeeId', 'idEmployee', 'ID Employee', 'Employee ID', 'ID_Karyawan', 'ID Karyawan', 'NRP', 'NIK'],
      position: ['position', 'positionTitle', 'Position Title', 'Position', 'Job Title', 'Jabatan'],
      level: ['level', 'Level', 'Jenjang', 'Golongan'],
      department: ['department', 'Department', 'Departement', 'Divisi'],
      section: ['section', 'Section', 'Seksi'],
      company: ['company', 'Company', 'Perusahaan', 'PT'],
      entity: ['entity', 'Entity', 'Entitas', 'Status Karyawan'],
      hireDate: ['hireDate', 'dateOfHire', 'Date Of Hire', 'Hire Date', 'Tanggal Masuk', 'Tgl Masuk'],
      additionDate: ['additionDate', 'addDate', 'Add Date', 'Tanggal Tambah']
    }
  },
  manpowerMitra: {
    tabs: ['manpower_mitra', 'manpower_external', 'tenagaKerjaMitra', 'MANPOWER_MITRA', 'MANPOWER_EXTERNAL', 'manpower mitra', 'Manpower Mitra', 'Mitra'],
    fields: {
      status: ['status', 'Status', 'Employee Status', 'Status Kerja'],
      employeeName: ['employeeName', 'Employee Name', 'Nama Karyawan', 'Nama'],
      employeeId: ['employeeId', 'idEmployee', 'ID Employee', 'Employee ID', 'ID_Karyawan', 'ID Karyawan', 'NRP', 'NIK'],
      position: ['position', 'positionTitle', 'Position Title', 'Position', 'Job Title', 'Jabatan'],
      level: ['level', 'Level', 'Jenjang', 'Golongan'],
      department: ['department', 'Department', 'Departement', 'Divisi'],
      section: ['section', 'Section', 'Seksi'],
      company: ['company', 'Company', 'Perusahaan', 'PT'],
      entity: ['entity', 'Entity', 'Entitas', 'Status Karyawan'],
      hireDate: ['hireDate', 'dateOfHire', 'Date Of Hire', 'Hire Date', 'Tanggal Masuk', 'Tgl Masuk'],
      additionDate: ['additionDate', 'addDate', 'Add Date', 'Tanggal Tambah']
    }
  },
  competencyList: {
    tabs: ['competencyList', 'daftarKompetensi', 'COMPETENCY LIST', 'Daftar Kompetensi'],
    fields: {
      paniCompetencyCode: ['paniCompetencyCode', 'KODE KOMPETENSI PANI', 'Kode PANI'],
      mdkaCompetencyCode: ['mdkaCompetencyCode', 'KODE KOMPETENSI MDKA', 'Kode MDKA'],
      competencyName: ['competencyName', 'NAMA KOMPETENSI', 'Nama Kompetensi', 'Kompetensi'],
      competencyType: ['competencyType', 'JENIS KOMPETENSI', 'Jenis'],
      trainingType: ['trainingType', 'TYPE TRAINING', 'Tipe Training'],
      supervisor: ['supervisor', 'PENYELIA', 'Penyelia', 'Supervisor'],
      trainingDuration: ['trainingDuration', 'DURASI TRAINING', 'Durasi', 'Durasi Training', 'Durasi (Jam)', 'Durasi Jam', 'Jam Training', 'Training Hours', 'Training Duration', 'Duration'],
      validityYears: ['validityYears', 'MASA BERLAKU / TAHUN', 'Masa Berlaku']
    }
  },
  miningEngineeringOperators: {
    tabs: ['miningEngineeringOperators', 'operatorDataMiningEngineering', 'Operator Data Mining & Engineer', 'Operator Mining'],
    fields: {
      no: ['no', 'NO', 'No'],
      crew: ['crew', 'CREW', 'Crew', 'Grup'],
      unitName: ['unitName', 'UNIT_Name', 'Unit Name', 'Model Unit', 'Unit'],
      employeeId: ['employeeId', 'ID_Karyawan', 'ID Karyawan', 'ID Employee', 'NRP'],
      employeeName: ['employeeName', 'NAME', 'Nama Karyawan', 'Nama'],
      position: ['position', 'POSITION', 'Position', 'Jabatan'],
      section: ['section', 'Section', 'Seksi'],
      departmentGroup: ['departmentGroup', 'Kelompok Departement', 'Kelompok Departemen', 'Department'],
      refresherDate: ['refresherDate', 'Refresh Date', 'Tanggal Refresher'],
      refresherStatus: ['refresherStatus', 'Refresh Status (completed/not yet)', 'Refresh Status', 'Status Refresher', 'Status'],
      trainerName: ['trainerName', 'Nama Trainer', 'Trainer', 'Instruktur']
    }
  },
  interviewRecap: {
    tabs: ['interviewRecap', 'rekapInterview', 'Rekap Interview', 'Interview Recap'],
    fields: {
      no: ['no', 'NO', 'No'],
      company: ['company', 'COMPANY', 'Perusahaan'],
      candidateName: ['candidateName', 'NAMA KANDIDAT', 'Nama Kandidat', 'Kandidat'],
      unitType: ['unitType', 'TIPE UNIT', 'Unit Type', 'Unit'],
      date: ['date', 'TANGGAL', 'Tanggal', 'Date'],
      remarks: ['remarks', 'KETERANGAN', 'Remarks', 'Status', 'Hasil'],
      instructor: ['instructor', 'INSTRUCTUR', 'INSTRUKTUR', 'Instruktur', 'Pewawancara']
    }
  },
  jobStandards: {
    tabs: ['jobStandards', 'standarJabatan', 'JOB STANDART', 'Job Standards'],
    fields: {
      no: ['no', 'No', 'NO'],
      position: ['position', 'Job Title', 'Position Title', 'Jabatan'],
      nationality: ['nationality', 'Nationality', 'Kewarganegaraan'],
      level: ['level', 'Level', 'Jenjang'],
      department: ['department', 'Department', 'Departement', 'Divisi'],
      section: ['section', 'Section', 'Seksi']
    }
  },
  jobCompetencyStandards: {
    tabs: ['jobCompetencyStandards', 'standarJabatanKompetensi', 'JOB_STANDART_X_COMPETENCY'],
    fields: {
      department: ['department', 'Department', 'Departement', 'Divisi'],
      section: ['section', 'Section', 'Seksi'],
      position: ['position', 'Job Title', 'Position Title', 'Jabatan'],
      level: ['level', 'Level', 'Jenjang'],
      category: ['category', 'Kategori', 'Category', 'Mandatory / Non Mandatory'],
      trainingName: ['trainingName', 'Nama Training', 'Training Name', 'Nama Modul', 'Kompetensi']
    }
  },
  assessmentResults: {
    tabs: ['assessmentResults', 'hasilAsesmen', 'Hasil Asesmen', 'Assessment Results'],
    fields: {
      examId: ['examId', 'Exam ID', 'ID Ujian'],
      submitTime: ['submitTime', 'Submit Time', 'Waktu'],
      pinCode: ['pinCode', 'PIN Code'],
      sessionBatch: ['sessionBatch', 'Session Batch', 'Batch'],
      employeeId: ['employeeId', 'ID Employee', 'NRP', 'NIK'],
      employeeName: ['employeeName', 'Employee Name', 'Nama'],
      moduleId: ['moduleId', 'Module ID'],
      certificateModuleName: ['certificateModuleName', 'Certificate Module Name', 'Nama Modul'],
      organizer: ['organizer', 'Organizer', 'Penyelenggara'],
      answered: ['answered', 'Answered', 'Terjawab'],
      correct: ['correct', 'Correct', 'Benar'],
      finalScore: ['finalScore', 'Final Score', 'Nilai Akhir', 'Skor'],
      passStatus: ['passStatus', 'Pass Status', 'Status Kelulusan', 'Status'],
      remainingTime: ['remainingTime', 'Remaining Time'],
      participantAnswersJson: ['participantAnswersJson', 'Participant Answers JSON'],
      certificateNo: ['certificateNo', 'Certificate No', 'No Sertifikat']
    }
  },
  simulatorResults: {
    tabs: ['simulatorResults', 'hasilSimulator', 'Hasil Simulator', 'Simulator Results'],
    fields: {
      submitTime: ['submitTime', 'Submit Time', 'Waktu'],
      employeeId: ['employeeId', 'ID Employee', 'NRP', 'NIK'],
      employeeName: ['employeeName', 'Employee Name', 'Nama'],
      simulatorType: ['simulatorType', 'Simulator Type', 'Tipe Simulator'],
      simulatorMaterial: ['simulatorMaterial', 'Simulator Material', 'Materi Praktik'],
      simulatorDuration: ['simulatorDuration', 'Simulator Duration', 'Durasi']
    }
  },
  trainerActivity: {
    raw: true,
    tabs: ['trainerActivity', 'aktivitasTrainer', 'Trainer Activity', 'trainer activity', 'Aktivitas Trainer'],
    fields: {}
  },
  summary: { raw: true, tabs: ['Summary', 'summary', 'Ringkasan'], fields: {} },
  schedule: { raw: true, tabs: ['schedule', 'jadwal', 'Schedule', 'Jadwal'], fields: {} }
};

// =========================================================================
// ENTRY POINT (READ-ONLY)
// =========================================================================
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const nocache = p.nocache === '1' || p.nocache === 'true';

    if (p.action === 'ping' || (!p.sheet && !p.sheets && !p.action)) {
      return json_(ping_(ss));
    }
    if (p.action === 'check') {
      return json_(check_(ss));
    }

    // ---- BATCH: semua tab dalam satu panggilan
    if (String(p.sheet || '').toLowerCase() === 'all' || p.sheets) {
      const keys = p.sheets
        ? String(p.sheets).split(',').map(normKey_).filter(function (k) { return SCHEMA[k]; })
        : BATCH_KEYS;
      const payloads = {};
      const errors = {};
      keys.forEach(function (k) {
        try { payloads[k] = readCached_(ss, k, nocache); }
        catch (err) { errors[k] = String(err && err.message ? err.message : err); }
      });
      return json_({ success: true, batch: true, timestamp: new Date().toISOString(), payloads: payloads, errors: errors });
    }

    const key = normKey_(p.sheet);
    if (!SCHEMA[key]) {
      return json_({ success: false, error: 'Kunci tab tidak dikenal: ' + key, validKeys: Object.keys(SCHEMA) });
    }
    return json_(readCached_(ss, key, nocache));
  } catch (err) {
    return json_({ success: false, error: String(err && err.message ? err.message : err) });
  }
}

// Normalisasi alias snake_case / kebab-case ke camelCase
function normKey_(raw) {
  let key = String(raw || '').trim();
  if (key === 'manpower_internal' || key === 'manpower-internal') key = 'manpowerInternal';
  if (key === 'manpower_mitra' || key === 'manpower-mitra') key = 'manpowerMitra';
  if (key === 'trainer_activity' || key === 'trainer-activity') key = 'trainerActivity';
  return key;
}

// =========================================================================
// CACHE SERVER (CacheService) - dipotong per ~90KB agar lolos batas 100KB
// =========================================================================
function readCached_(ss, key, nocache) {
  const cache = CacheService.getScriptCache();
  const ck = (key === 'trainingRealization' ? 'v7:' : 'v6:') + key;
  if (!nocache) {
    try {
      const meta = cache.get(ck + ':n');
      if (meta) {
        const n = parseInt(meta, 10);
        const names = []; for (let i = 0; i < n; i++) names.push(ck + ':' + i);
        const got = cache.getAll(names);
        let txt = '', ok = true;
        for (let i = 0; i < n; i++) { if (got[ck + ':' + i] == null) { ok = false; break; } txt += got[ck + ':' + i]; }
        if (ok) { const obj = JSON.parse(txt); obj.cached = true; return obj; }
      }
    } catch (e) { /* abaikan, baca ulang */ }
  }
  const payload = readSheet_(ss, key);
  try {
    // Payload besar (puluhan ribu baris) tidak muat di CacheService: lewati agar tidak buang waktu
    const cells = (payload.rows ? payload.rows.length : 0) * (payload.headers ? payload.headers.length : 0);
    if (cells > 120000) return payload;
    const txt = JSON.stringify(payload);
    const parts = Math.ceil(txt.length / CACHE_CHUNK);
    const hasData = payload && payload.rows && payload.rows.length > 0 && !payload.importPending;
    if (hasData && parts <= 20) {
      const map = {}; map[ck + ':n'] = String(parts);
      for (let i = 0; i < parts; i++) map[ck + ':' + i] = txt.substr(i * CACHE_CHUNK, CACHE_CHUNK);
      cache.putAll(map, CACHE_SECONDS);
    }
  } catch (e) { /* cache gagal bukan masalah */ }
  return payload;
}

// =========================================================================
// CEK KUALITAS DATA & CAKUPAN PEMETAAN  (?action=check)
// =========================================================================
const CHECK_RULES = {
  interviewRecap:   { required: ['candidateName', 'unitType', 'date', 'remarks', 'instructor'], id: null,
                      allowed: { remarks: ['Kompeten', 'Tidak Kompeten'] } },
  trainingRealization: { required: ['employeeId', 'employeeName', 'department', 'competencyTrainingTopic', 'trainingDate'], id: null },
  trainingBudget:   { required: ['year', 'entity', 'employeeId', 'topicTitle', 'hoCost'], id: null },
  manpower:         { required: ['employeeId', 'employeeName', 'department', 'position', 'entity'], id: 'employeeId',
                      allowed: { entity: ['Organik MDKA', 'Labour Supply'] } },
  manpowerInternal: { required: ['employeeId', 'employeeName', 'department', 'position'], id: 'employeeId' },
  manpowerMitra:    { required: ['employeeId', 'employeeName', 'department', 'position'], id: 'employeeId' },
  miningEngineeringOperators: { required: ['employeeId', 'employeeName', 'unitName', 'refresherStatus'], id: 'employeeId' },
  assessmentResults: { required: ['employeeId', 'certificateModuleName', 'finalScore', 'passStatus'], id: null },
  simulatorResults: { required: ['employeeId', 'simulatorType', 'submitTime'], id: null },
  jobStandards:     { required: ['position', 'department'], id: null },
  competencyList:   { required: ['competencyName', 'competencyType', 'trainingDuration'], id: null },
  trainerActivity:  { required: ['timestampInput', 'instructorName', 'trainingProgram'], id: null }
};

function check_(ss) {
  const report = { success: true, timestamp: new Date().toISOString(), tabs: {}, otherTabsNotRead: [] };
  Object.keys(SCHEMA).forEach(function (key) {
    const rule = CHECK_RULES[key] || { required: [], id: null, allowed: {} };
    const p = readSheet_(ss, key);
    const t = {
      found: p.found !== false,
      rows: (p.rows || []).length,
      sourceHeaders: p.sourceHeaders || [],
      mappedHeaders: p.headers || [],
      unmappedHeaders: p.unmappedHeaders || [],
      sourceHeaderRow: p.sourceHeaderRow || null,
      sourceNonEmptyRows: p.sourceNonEmptyRows || 0,
      rowsWithoutMappedValues: p.rowsWithoutMappedValues || 0,
      issues: []
    };
    if (!t.found) { t.issues.push('Tab tidak ditemukan. Nama yang dikenali: ' + SCHEMA[key].tabs.join(' | ')); report.tabs[key] = t; return; }
    if (t.unmappedHeaders.length) {
      t.issues.push('Kolom sumber belum dipetakan: ' + t.unmappedHeaders.map(function (h) { return h.column + ' (' + h.name + ')'; }).join(', '));
    }
    if (t.rowsWithoutMappedValues) {
      t.issues.push(t.rowsWithoutMappedValues + ' baris berisi data sumber tetapi kosong pada semua kolom yang dipetakan');
    }
    if (t.rows === 0) t.issues.push('Tab ditemukan tetapi belum memiliki baris data yang terbaca.');
    const H = p.headers || [];
    const missing = rule.required.filter(function (c) { return H.indexOf(c) === -1; });
    if (missing.length) t.issues.push('Kolom wajib tidak terbaca: ' + missing.join(', '));
    rule.required.forEach(function (c) {
      const i = H.indexOf(c); if (i === -1) return;
      let blank = 0; p.rows.forEach(function (r) { if (r[i] === '' || r[i] == null) blank++; });
      if (blank) t.issues.push('Kolom ' + c + ' kosong di ' + blank + ' baris (' + Math.round(blank / p.rows.length * 100) + '%)');
    });
    if (rule.id) {
      const i = H.indexOf(rule.id);
      if (i !== -1) {
        const seen = {}, dup = {};
        const ignoredIds = ['-', '0', 'N/A', 'NA', 'NONE', 'NULL', 'TBA', 'TBD'];
        const entityIdx = key === 'manpower' ? H.indexOf('entity') : -1;
        p.rows.forEach(function (r) {
          const v = String(r[i] || '').trim().toUpperCase();
          if (!v || ignoredIds.indexOf(v) !== -1) return;
          const identity = entityIdx !== -1 ? String(r[entityIdx] || '').trim() + '|' + v : v;
          if (seen[identity]) dup[v] = 1;
          seen[identity] = 1;
        });
        const d = Object.keys(dup);
        if (d.length) t.issues.push(d.length + ' ' + rule.id + ' duplikat, contoh: ' + d.slice(0, 5).join(', '));
      }
    }
    Object.keys(rule.allowed || {}).forEach(function (c) {
      const i = H.indexOf(c); if (i === -1) return;
      const bad = {};
      p.rows.forEach(function (r) { const v = String(r[i] || '').trim(); if (v && rule.allowed[c].indexOf(v) === -1) bad[v] = (bad[v] || 0) + 1; });
      const b = Object.keys(bad);
      if (b.length) t.issues.push('Nilai ' + c + ' di luar daftar baku (' + rule.allowed[c].join(' / ') + '): ' + b.slice(0, 6).join(', '));
    });
    // kategori hampir sama (beda huruf besar/kecil/spasi)
    ['unitType', 'unitName', 'department', 'instructor', 'company'].forEach(function (c) {
      const i = H.indexOf(c); if (i === -1) return;
      const groups = {};
      p.rows.forEach(function (r) { const v = String(r[i] || '').trim(); if (!v) return; const n = v.toLowerCase().replace(/[^a-z0-9]/g, ''); (groups[n] = groups[n] || {})[v] = 1; });
      const dup = Object.keys(groups).filter(function (n) { return Object.keys(groups[n]).length > 1; });
      if (dup.length) t.issues.push('Penulisan ' + c + ' tidak seragam: ' + dup.slice(0, 4).map(function (n) { return Object.keys(groups[n]).join(' / '); }).join('; '));
    });
    report.tabs[key] = t;
  });
  const known = {};
  Object.keys(SCHEMA).forEach(function (k) { SCHEMA[k].tabs.forEach(function (t) { known[norm_(t)] = true; }); });
  report.otherTabsNotRead = ss.getSheets().map(function (x) { return x.getName(); }).filter(function (n) { return !known[norm_(n)]; });
  return report;
}

// =========================================================================
// PING STATUS (Cek koneksi & tab terdeteksi)
// =========================================================================
function ping_(ss) {
  const tabs = {};
  const tz = Session.getScriptTimeZone();

  Object.keys(SCHEMA).forEach(function (key) {
    const def = SCHEMA[key];
    const sh = findSheet_(ss, def.tabs);
    if (sh) {
      tabs[key] = { found: true, tab: sh.getName(), rows: Math.max(0, sh.getLastRow() - 1) };
      if (isImportLoading_(sh)) tabs[key].importPending = true;
    } else if (key === 'manpower') {
      // Cek apakah ada tab pecahan: manpower_internal & manpower_mitra
      const shInt = findSheet_(ss, SCHEMA.manpowerInternal.tabs);
      const shMit = findSheet_(ss, SCHEMA.manpowerMitra.tabs);
      if (shInt || shMit) {
        const r1 = shInt ? Math.max(0, shInt.getLastRow() - 1) : 0;
        const r2 = shMit ? Math.max(0, shMit.getLastRow() - 1) : 0;
        const names = [shInt ? shInt.getName() : null, shMit ? shMit.getName() : null].filter(Boolean);
        tabs[key] = { found: true, tab: names.join(' + '), rows: r1 + r2 };
      } else {
        tabs[key] = { found: false };
      }
    } else {
      tabs[key] = { found: false };
    }
  });

  const known = {};
  Object.keys(SCHEMA).forEach(function (k) { SCHEMA[k].tabs.forEach(function (t) { known[norm_(t)] = true; }); });
  const other = ss.getSheets().map(function (s) { return s.getName(); }).filter(function (n) { return !known[norm_(n)]; });
  return { success: true, spreadsheet: ss.getName(), timestamp: new Date().toISOString(), tabs: tabs, otherTabsNotRead: other };
}

// =========================================================================
// PEMBACA TAB -> { headers: [camelCase...], rows: [[...]] }
// =========================================================================
function readSheet_(ss, key) {
  const def = SCHEMA[key];
  const tz = Session.getScriptTimeZone();

  // KASUS KHUSUS: MANPOWER (Bisa tab tunggal MANPOWER atau gabungan manpower_internal + manpower_mitra)
  if (key === 'manpower') {
    // 1. PRIORITAS UTAMA: Cari tab pecahan manpower_internal & manpower_mitra
    const shInt = findSheet_(ss, SCHEMA.manpowerInternal.tabs);
    const shMit = findSheet_(ss, SCHEMA.manpowerMitra.tabs);
    if (shInt || shMit) {
      const pInt = shInt ? readSingleSheetValues_(shInt, SCHEMA.manpowerInternal, tz, 'Organik MDKA') : null;
      const pMit = shMit ? readSingleSheetValues_(shMit, SCHEMA.manpowerMitra, tz, 'Labour Supply') : null;
      return combineManpowerPayloads_(pInt, pMit, key);
    }

    // 2. JIKA TAB PECAHAN TIDAK ADA, BARU CARI TAB TUNGGAL MANPOWER
    const singleSh = findSheet_(ss, def.tabs);
    if (singleSh && singleSh.getLastRow() >= 2) {
      const res = readSingleSheetValues_(singleSh, def, tz, '');
      return {
        success: true,
        key: key,
        found: true,
        tab: singleSh.getName(),
        timestamp: new Date().toISOString(),
        headers: res.headers,
        labels: res.labels,
        sourceHeaders: res.sourceHeaders,
        unmappedHeaders: res.unmappedHeaders,
        sourceHeaderRow: res.sourceHeaderRow,
        sourceNonEmptyRows: res.sourceNonEmptyRows,
        rowsWithoutMappedValues: res.rowsWithoutMappedValues,
        rows: res.rows
      };
    }

    return { success: true, key: key, found: false, timestamp: new Date().toISOString(), headers: [], labels: [], rows: [] };
  }

  // KASUS NORMAL (Tab Tunggal)
  const sh = findSheet_(ss, def.tabs);
  const out = { success: true, key: key, found: !!sh, timestamp: new Date().toISOString(), headers: [], labels: [], rows: [] };
  if (!sh) return out;

  const defaultEntity = (key === 'manpowerInternal') ? 'Organik MDKA' : (key === 'manpowerMitra' ? 'Labour Supply' : '');
  const res = readSingleSheetValues_(sh, def, tz, defaultEntity);
  if (!res) { out.tab = sh.getName(); out.importPending = isImportLoading_(sh); return out; }

  // Sheet sumber adalah penentu kategori; nama perusahaan tidak mengubah kategori sumber.
  if (key === 'manpowerInternal' || key === 'manpowerMitra') {
    const eIdx = res.headers.indexOf('entity');
    const targetEntity = (key === 'manpowerInternal') ? 'Organik MDKA' : 'Labour Supply';
    res.rows.forEach(function(r) {
      if (eIdx !== -1) r[eIdx] = targetEntity;
    });
  }

  out.tab = sh.getName();
  out.headers = res.headers;
  out.labels = res.labels;
  out.sourceHeaders = res.sourceHeaders;
  out.unmappedHeaders = res.unmappedHeaders;
  out.sourceHeaderRow = res.sourceHeaderRow;
  out.sourceNonEmptyRows = res.sourceNonEmptyRows;
  out.rowsWithoutMappedValues = res.rowsWithoutMappedValues;
  out.rows = res.rows;
  out.importPending = (res.rows.length === 0 && isImportLoading_(sh));
  return out;
}

// =========================================================================
// PARSER SATU TAB DENGAN FIELD MAPPING
// =========================================================================
// Tab berisi IMPORTRANGE/QUERY bisa berstatus "Loading..." atau baru berisi 1 baris.
function isImportLoading_(sh) {
  const lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) return false;
  const a1 = String(sh.getRange(1, 1).getDisplayValue() || '').trim();
  if (/^(loading|memuat)/i.test(a1)) return true;
  if (lr <= 1) {
    const f = String(sh.getRange(1, 1).getFormula() || '');
    if (/IMPORTRANGE|QUERY/i.test(f)) return true;
  }
  return false;
}
// Anggaran tunggu GLOBAL per permintaan (bukan per tab) agar pemuatan tidak berlarut-larut.
let IMPORT_WAIT_LEFT_MS = 5000;
function waitForImport_(sh) {
  while (IMPORT_WAIT_LEFT_MS > 0 && isImportLoading_(sh)) {
    SpreadsheetApp.flush();
    Utilities.sleep(1500);
    IMPORT_WAIT_LEFT_MS -= 1500;
  }
}

function readSingleSheetValues_(sh, def, tz, defaultEntity) {
  if (!sh) return null;
  waitForImport_(sh);
  const lastRow = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return null;
  if (!def.raw && lastRow < 2) return null;

  let values = sh.getRange(1, 1, lastRow, lastCol).getValues();
  let headerOffset = 0;
  // Cari baris header sebenarnya (maks. 8 baris pertama) dengan skor kecocokan alias
  if (!def.raw) {
    const known = {};
    Object.keys(def.fields).forEach(function (c) {
      known[norm_(c)] = 1; def.fields[c].forEach(function (a) { known[norm_(a)] = 1; });
    });
    let bestRow = 0, bestScore = -1;
    for (let r = 0; r < Math.min(8, values.length); r++) {
      let sc = 0; values[r].forEach(function (c) { if (known[norm_(c)]) sc++; });
      if (sc > bestScore) { bestScore = sc; bestRow = r; }
    }
    if (bestRow > 0 && bestScore > 0) {
      values = values.slice(bestRow);
      headerOffset = bestRow;
    }
  }
  const rawHeaders = values[0].map(function (h) { return String(h == null ? '' : h); });
  const headerless = !!def.raw && rawHeaders.every(function (h) { return !h.trim(); });
  const startRow = headerless ? 0 : 1;

  const colMap = []; // [{idx, name, label}]
  const used = {};

  if (def.raw) {
    rawHeaders.forEach(function (h, idx) {
      const label = (!headerless && h.trim()) ? h.trim() : 'Kolom ' + colLetter_(idx);
      let name = camel_(label) || ('col' + (idx + 1));
      while (used[name]) name += '_' + (idx + 1);
      used[name] = true;
      colMap.push({ idx: idx, name: name, label: label });
    });
  } else {
    // Alias ambigu (mis. "Status" ada di >1 field) diputuskan di pass ke-2:
    // field yang sudah terisi kolom lain (mis. "Manpower Status") tidak dipakai lagi.
    const cand = {};   // norm(header) -> [field,...]
    Object.keys(def.fields).forEach(function (camel) {
      [camel].concat(def.fields[camel]).forEach(function (raw) {
        const n = norm_(raw);
        cand[n] = cand[n] || [];
        if (cand[n].indexOf(camel) === -1) cand[n].push(camel);
      });
    });
    const pending = [];
    rawHeaders.forEach(function (h, idx) {
      const c = cand[norm_(h)];
      if (!c) return;
      if (c.length === 1) {
        if (!used[c[0]]) { used[c[0]] = true; colMap.push({ idx: idx, name: c[0], label: h.trim() }); }
      } else {
        pending.push({ idx: idx, h: h, c: c });
      }
    });
    pending.forEach(function (x) {
      for (let i = x.c.length - 1; i >= 0; i--) {   // utamakan field yang didefinisikan terakhir (perilaku lama)
        if (!used[x.c[i]]) { used[x.c[i]] = true; colMap.push({ idx: x.idx, name: x.c[i], label: x.h.trim() }); break; }
      }
    });
    colMap.sort(function (a, b) { return a.idx - b.idx; });
  }

  const hasEntityCol = !def.raw && (used['entity'] !== undefined);
  const rows = [];
  const hasVal = new Array(colMap.length).fill(false);
  const sourceColumnHasData = new Array(rawHeaders.length).fill(false);
  let nonEmptySourceRows = 0;
  let rowsWithoutMappedValues = 0;

  for (let r = startRow; r < values.length; r++) {
    const row = values[r];
    let rawHas = false;
    for (let c = 0; c < rawHeaders.length; c++) {
      if (clean_(row[c], tz) !== '') {
        rawHas = true;
        sourceColumnHasData[c] = true;
      }
    }
    if (rawHas) nonEmptySourceRows++;

    let has = false;
    const rec = new Array(colMap.length);
    for (let c = 0; c < colMap.length; c++) {
      const v = clean_(row[colMap[c].idx], tz);
      rec[c] = v;
      if (v !== '') { has = true; hasVal[c] = true; }
    }

    if (hasEntityCol && defaultEntity) {
      const eIdx = colMap.findIndex(function (x) { return x.name === 'entity'; });
      if (eIdx !== -1 && (!rec[eIdx] || rec[eIdx] === '')) {
        rec[eIdx] = defaultEntity;
      }
    }

    if (has) rows.push(rec);
    else if (rawHas) rowsWithoutMappedValues++;
  }

  let keep = colMap.map(function (_, i) { return i; });
  if (def.raw) keep = keep.filter(function (i) { return hasVal[i]; });

  const outHeaders = keep.map(function (i) { return colMap[i].name; });
  const outLabels = keep.map(function (i) { return colMap[i].label; });
  let outRows = (keep.length === colMap.length) ? rows : rows.map(function (rec) { return keep.map(function (i) { return rec[i]; }); });
  const mappedColumns = {};
  colMap.forEach(function (column) { mappedColumns[column.idx] = true; });
  const sourceHeaderEntries = rawHeaders.map(function (header, idx) {
    const name = header.trim() || (sourceColumnHasData[idx] ? '(tanpa judul)' : '');
    return { index: idx, column: colLetter_(idx), name: name };
  }).filter(function (header) { return header.name; });
  const sourceHeaders = sourceHeaderEntries.map(function (header) {
    return { column: header.column, name: header.name };
  });
  const unmappedHeaders = sourceHeaderEntries.filter(function (header) {
    return !mappedColumns[header.index];
  }).map(function (header) {
    return { column: header.column, name: header.name };
  });

  // Jika kolom entity tidak ada di sheet tetapi defaultEntity didefinisikan (khusus manpower internal/mitra)
  if (!def.raw && !hasEntityCol && defaultEntity) {
    outHeaders.push('entity');
    outLabels.push('Entity');
    outRows = outRows.map(function (r) {
      const c = r.slice();
      c.push(defaultEntity);
      return c;
    });
  }

  return {
    headers: outHeaders,
    labels: outLabels,
    rows: outRows,
    sourceHeaders: sourceHeaders,
    unmappedHeaders: unmappedHeaders,
    sourceHeaderRow: headerOffset + 1,
    sourceNonEmptyRows: nonEmptySourceRows,
    rowsWithoutMappedValues: rowsWithoutMappedValues
  };
}

// =========================================================================
// PENGGABUNG PAYLOAD DUA TAB MANPOWER (Internal + Mitra) DENGAN DEDUPLIKASI
// =========================================================================
function combineManpowerPayloads_(p1, p2, key) {
  const h1 = p1 ? p1.headers : [];
  const h2 = p2 ? p2.headers : [];
  const l1 = p1 ? p1.labels : [];
  const l2 = p2 ? p2.labels : [];

  const unionHeaders = [];
  const unionLabels = [];

  function addHeaders(h, l) {
    for (let i = 0; i < h.length; i++) {
      if (unionHeaders.indexOf(h[i]) === -1) {
        unionHeaders.push(h[i]);
        unionLabels.push(l[i] || h[i]);
      }
    }
  }
  addHeaders(h1, l1);
  addHeaders(h2, l2);

  if (unionHeaders.indexOf('entity') === -1) {
    unionHeaders.push('entity');
    unionLabels.push('Entity');
  }

  const combinedRows = [];
  const seenIds = Object.create(null);
  const idIdx = unionHeaders.indexOf('employeeId');
  const eIdx = unionHeaders.indexOf('entity');

  function appendPayload(p, fallbackEntity) {
    if (!p || !p.rows || !p.rows.length) return;
    const pHeaders = p.headers;

    for (let r = 0; r < p.rows.length; r++) {
      const src = p.rows[r];
      const target = new Array(unionHeaders.length);

      for (let c = 0; c < unionHeaders.length; c++) {
        const uName = unionHeaders[c];
        const sIdx = pHeaders.indexOf(uName);
        target[c] = sIdx !== -1 ? src[sIdx] : '';
      }

      if (eIdx !== -1) {
        target[eIdx] = fallbackEntity;
      }

      if (idIdx !== -1) {
        const empId = String(target[idIdx] || '').trim().toUpperCase();
        const isGeneric = !empId || empId === '-' || empId === '0' || empId === 'N/A' || empId === 'TBA' || empId === 'NONE';
        if (!isGeneric) {
          const sourceId = (eIdx !== -1 ? target[eIdx] : fallbackEntity) + '|' + empId;
          if (seenIds[sourceId] !== undefined) {
            const existing = combinedRows[seenIds[sourceId]];
            for (let c = 0; c < unionHeaders.length; c++) {
              if ((existing[c] == null || existing[c] === '') && target[c] != null && target[c] !== '') {
                existing[c] = target[c];
              }
            }
            continue;
          }
          seenIds[sourceId] = combinedRows.length;
        }
      }

      combinedRows.push(target);
    }
  }

  appendPayload(p1, 'Organik MDKA');
  appendPayload(p2, 'Labour Supply');

  const tabNames = [];
  if (p1 && p1.rows.length) tabNames.push('manpower_internal (' + p1.rows.length + ')');
  if (p2 && p2.rows.length) tabNames.push('manpower_mitra (' + p2.rows.length + ')');

  return {
    success: true,
    key: key,
    found: combinedRows.length > 0,
    tab: tabNames.length ? tabNames.join(' + ') : 'manpower_internal + manpower_mitra',
    timestamp: new Date().toISOString(),
    headers: unionHeaders,
    labels: unionLabels,
    rows: combinedRows
  };
}

// =========================================================================
// UTILITAS
// =========================================================================
function findSheet_(ss, names) {
  const all = ss.getSheets();
  const wanted = names.map(norm_);
  for (let i = 0; i < all.length; i++) {
    if (wanted.indexOf(norm_(all[i].getName())) !== -1) return all[i];
  }
  return null;
}

function camel_(s) {
  const w = String(s == null ? '' : s).replace(/[^A-Za-z0-9]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '';
  return w.map(function (x, i) { return i === 0 ? x.charAt(0).toLowerCase() + x.slice(1) : x.charAt(0).toUpperCase() + x.slice(1); }).join('');
}

function colLetter_(i) {
  let s = '';
  i++;
  while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
  return s;
}

function norm_(s) {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function clean_(v, tz) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) {
    if (isNaN(v.getTime()) || v.getFullYear() < 1950) return '';
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  if (typeof v === 'string') {
    // rapikan spasi ganda, spasi tak terlihat (NBSP, zero-width)
    const t = v.replace(/[\u00A0\u200B\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^#(N\/A|REF!|VALUE!|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)/i.test(t)) return '';
    // tanggal teks dd-MM-yyyy / dd/MM/yyyy / dd.MM.yyyy -> yyyy-MM-dd
    const m = t.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})$/);
    if (m) {
      const d = +m[1], mo = +m[2], y = +m[3];
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return y + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
      }
    }
    return t;
  }
  return v;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}