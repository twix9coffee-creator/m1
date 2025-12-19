const statusEl = document.getElementById("status");

const empName = document.getElementById("empName");
const empId = document.getElementById("empId");
const img1 = document.getElementById("img1");
const img2 = document.getElementById("img2");

const rName = document.getElementById("rName");
const rId = document.getElementById("rId");
const rImg1 = document.getElementById("rImg1");
const rImg2 = document.getElementById("rImg2");
const hint1 = document.getElementById("hint1");
const hint2 = document.getElementById("hint2");
const rDate = document.getElementById("rDate");

const previewBtn = document.getElementById("previewBtn");
const exportBtn = document.getElementById("exportBtn");
const report = document.getElementById("report");

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

function validateForm() {
  if (!empName.value.trim()) return "فضلاً أدخلي اسم الموظف.";
  if (!empId.value.trim()) return "فضلاً أدخلي رقم الموظف.";
  if (!img1.files || !img1.files[0]) return "فضلاً ارفعي الصورة الأولى.";
  if (!img2.files || !img2.files[0]) return "فضلاً ارفعي الصورة الثانية.";
  return null;
}

async function updatePreview() {
  rName.textContent = empName.value.trim() || "—";
  rId.textContent = empId.value.trim() || "—";
  rDate.textContent = new Date().toLocaleString("ar-SA");

  // الصورة الأولى
  if (img1.files && img1.files[0]) {
    const dataUrl = await fileToDataURL(img1.files[0]);
    rImg1.src = dataUrl;
    rImg1.style.display = "block";
    hint1.textContent = img1.files[0].name;
  } else {
    rImg1.removeAttribute("src");
    rImg1.style.display = "none";
    hint1.textContent = "—";
  }

  // الصورة الثانية
  if (img2.files && img2.files[0]) {
    const dataUrl = await fileToDataURL(img2.files[0]);
    rImg2.src = dataUrl;
    rImg2.style.display = "block";
    hint2.textContent = img2.files[0].name;
  } else {
    rImg2.removeAttribute("src");
    rImg2.style.display = "none";
    hint2.textContent = "—";
  }
}

async function exportPDF() {
  const err = validateForm();
  if (err) {
    setStatus(err);
    return;
  }

  // فحص تحميل المكتبات (لو CDN ما اشتغل)
  if (!window.html2canvas) {
    setStatus("مكتبة html2canvas لم تُحمّل. تأكدي من اتصال الإنترنت أو من ترتيب السكربتات.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    setStatus("مكتبة jsPDF لم تُحمّل. تأكدي من اتصال الإنترنت أو من ترتيب السكربتات.");
    return;
  }

  setStatus("جارٍ تجهيز المعاينة ثم إنشاء PDF…");
  exportBtn.disabled = true;
  previewBtn.disabled = true;

  try {
    await updatePreview();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    // تصدير عنصر HTML إلى PDF
    await doc.html(report, {
      x: 10,
      y: 10,
      width: 190,
      windowWidth: report.scrollWidth,
      html2canvas: {
        scale: 1,      // أقل مشاكل وأخف على Safari
        useCORS: true
      },
      callback: function (doc) {
        // تنزيل PDF بطريقة متوافقة مع Safari
        const safeName = (empName.value.trim() || "employee").replace(/[^\w\u0600-\u06FF-]+/g, "_");
        const filename = `employee_${safeName}.pdf`;

        const blob = doc.output("blob");
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();

        URL.revokeObjectURL(url);
      }
    });

    setStatus("تم إنشاء ملف PDF وتنزيله.");
  } catch (e) {
    console.error(e);
    setStatus("صار خطأ أثناء التصدير. جرّبي صور أصغر حجمًا أو حدّثي الصفحة.");
  } finally {
    exportBtn.disabled = false;
    previewBtn.disabled = false;
  }
}

// أزرار
previewBtn.addEventListener("click", async () => {
  setStatus("");
  try {
    await updatePreview();
    setStatus("تم تحديث المعاينة.");
  } catch (e) {
    console.error(e);
    setStatus("تعذر تحديث المعاينة.");
  }
});

exportBtn.addEventListener("click", exportPDF);

// تنظيف الرسائل
[empName, empId, img1, img2].forEach(el => el.addEventListener("input", () => setStatus("")));
[img1, img2].forEach(el => el.addEventListener("change", () => setStatus("")));
