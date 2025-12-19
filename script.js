async function exportPDF() {
  const report = document.getElementById("report");

  if (!report) {
    alert("عنصر التقرير غير موجود");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4"
  });

  await doc.html(report, {
    x: 10,
    y: 10,
    width: 190,
    windowWidth: report.scrollWidth,
    html2canvas: {
      scale: 1,
      useCORS: true
    },
    callback: function (doc) {
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "employee.pdf";
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  });
}
