/**
 * @deprecated Gunakan "@/lib/printer/escpos-compat" sebagai gantinya.
 * File ini hanya re-export untuk backward compatibility.
 */
export {
  type EscPosMode,
  type ReceiptTextLine,
  type EscPosPrintResult,
  getPreferredMode,
  setPreferredMode,
  getBaudRate,
  setBaudRate,
  isWebSerialSupported,
  isWebBluetoothSupported,
  buildEscPosFromReceiptDom,
  buildReceiptLines,
  buildReceiptText,
  pickSerialPort,
  pickBluetoothPrinter,
  printReceiptEscPos,
  hasReadyPrinter,
  forgetPrinter,
} from "@/lib/printer/escpos-compat";
