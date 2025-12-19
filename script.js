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

// نخزن صور مصغرة هنا بدل الاعتماد على الملف الأصلي الضخم
let resizedDataUrl1 = null;
let resizedDataUrl2 = null;

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function validateForm() {
  if (!empName.value.trim()) return "فضلاً أدخلي اسم الموظف.";
  if (!empId.value.trim()) return "فضلاً أدخلي رقم الموظف.";
  if (!img1.files || !img1.files[0]) return "فضلاً ارفعي الصورة الأولى.";
  if (!img2.files || !img2.files[0]) return "فضلاً ارفعي الصورة الثانية.";
  return null;
}

/**
 * تصغير + ضغط الصور قبل استخدامها (مهم جدًا للـ PDF)
 * maxSide: أكبر ضلع (عرض/ارتفاع)
 * quality: جودة JPEG (0-1)
 */
function resizeImageToDataURL(file, maxSide = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة الصورة"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("تعذر تحميل الصورة"));
      img.onload = () => {
        let { width, height } = img;

        // حساب نسبة التصغير
        const scale = Math.min(1, maxSide / Math.max(width, height));
        const newW = Math.round(width * scale);
        const newH = Math.round(height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;

        const ctx = canvas.getContext("2d");
        // خلفية بيضاء لتفادي شفافية غريبة
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, newW, newH);

        ctx.drawImage(img, 0, 0, newW, newH);

        // نحولها JPEG مضغوط
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function updatePreview() {
  rName.textContent = empName.value.trim() || "—";
  rId.textContent = empId.value.trim() || "—";
  rDate.textContent = new Date().toLocaleString("ar-SA");

  // الصورة الأولى: إن لم نجهزها بعد، جهزيها
  if (img1.files && img1.files[0]) {
    if (!resizedDataUrl1) {
      resizedDataUrl1 = await resizeImageToDataURL(img1.files[0], 1200, 0.82);
    }
    rImg1.src = resizedDataUrl1;
    rImg1.style.display = "block";
    hint1.textContent = img1.files[0].name + " (تم تصغيرها)";
  } else {
    resizedDataUrl1 = null;
    rImg1.removeAttribute("src");
    rImg1.style.display = "none";
    hint1.textContent = "—";
  }

  // الصورة الثانية
  if (img2.files && img2.files[0]) {
    if (!resizedDataUrl2) {
      resizedDataUrl2 = await resizeImageToDataURL(img2.files[0], 1200, 0.82);
    }
    rImg2.src = resizedDataUrl2;
    rImg2.style.display = "block";
    hint2.textContent = img2.files[0].name + " (تم تصغيرها)";
  } else {
    resizedDataUrl2 = null;
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

  if (!window.html2canvas) {
    setStatus("مكتبة html2canvas لم تُحمّل. تأكدي من اتصال الإنترنت.");
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    setStatus("مكتبة jsPDF لم تُحمّل. تأكدي من اتصال الإنترنت.");
    return;
  }

  exportBtn.disabled = true;
  previewBtn.disabled = true;
  setStatus("جارٍ تجهيز المعاينة وإنشاء PDF…");

  // نفعل وضع التصدير (يلغي backdrop-filter أثناء الالتقاط)
  document.body.classList.add("exporting");

  try {
    // تأكدي أن الصور مصغرة قبل الالتقاط
    await updatePreview();

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

    await doc.html(report, {
      x: 10,
      y: 10,
      width: 190,
      windowWidth: report.scrollWidth,

      html2canvas: {
        scale: 1.5,               // جودة معقولة بدون تضخيم
        useCORS: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc) => {
          // هذا الجزء “يضبط” Safari: نلغي المؤثرات في النسخة الملتقطة فقط
          clonedDoc.body.classList.add("exporting");

          const cards = clonedDoc.querySelectorAll(".card");
          cards.forEach((c) => {
            c.style.backdropFilter = "none";
            c.style.webkitBackdropFilter = "none";
          });

          // احتياط: تأكد خلفية التقرير بيضاء
          const clonedReport = clonedDoc.getElementById("report");
          if (clonedReport) clonedReport.style.background = "#ffffff";
        }
      },

      callback: function (doc) {
        const safeName = (empName.value.trim() || "employee")
          .replace(/[^\w\u0600-\u06FF-]+/g, "_");
        const filename = `employee_${safeName}.pdf`;

        // تنزيل متوافق مع Safari
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
    setStatus("صار خطأ أثناء التصدير. جرّبي صور أصغر أو حدّثي الصفحة.");
  } finally {
    document.body.classList.remove("exporting");
    exportBtn.disabled = false;
    previewBtn.disabled = false;
  }
}

// أزرار
previewBtn.addEventListener("click", async () => {
  setStatus("");
  try {
    await updatePreview();
    setStatus("تم تحديث المعاينة (مع تصغير الصور).");
  } catch (e) {
    console.error(e);
    setStatus("تعذر تحديث المعاينة.");
  }
});

exportBtn.addEventListener("click", exportPDF);

// عند تغيير الصور: صفري النسخ المصغرة ليعاد تجهيزها
img1.addEventListener("change", () => { resizedDataUrl1 = null; setStatus(""); });
img2.addEventListener("change", () => { resizedDataUrl2 = null; setStatus(""); });

// تنظيف رسائل عند الكتابة
[empName, empId].forEach(el => el.addEventListener("input", () => setStatus("")));
