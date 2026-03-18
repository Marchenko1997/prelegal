export function printDocument(html: string): void {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    alert("Please allow pop-ups to download the PDF.");
    return;
  }

  // Assign onload BEFORE document.write to avoid the race where the load
  // event fires before the handler is attached.
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };

  printWindow.document.write(html);
  printWindow.document.close();

  // Fallback: if onload already fired synchronously (common in Chrome),
  // trigger print after a short delay.
  setTimeout(() => {
    if (printWindow && !printWindow.closed) {
      printWindow.focus();
      printWindow.print();
    }
  }, 500);
}
