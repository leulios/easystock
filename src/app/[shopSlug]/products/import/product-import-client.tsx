"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { previewProductImportAction, executeProductImportAction } from "@/app/actions/import";
import { ImportValidationResult, CsvProductRow } from "@/lib/services/import-service";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Download,
  Check,
  XCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ProductImportClientProps {
  shopSlug: string;
}

export function ProductImportClient({ shopSlug }: ProductImportClientProps) {
  const router = useRouter();
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const [importedSummary, setImportedSummary] = useState<{ imported: number; categories: number } | null>(null);

  const [isPending, startTransition] = useTransition();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setValidationResult(null);
    setImportSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      validateFile(content);
    };
    reader.onerror = () => {
      setErrorMessage("Failed to read the uploaded file.");
    };
    reader.readAsText(file);
  };

  const validateFile = (rawCsv: string) => {
    startTransition(async () => {
      const res = await previewProductImportAction(rawCsv);
      if (!res.success) {
        setErrorMessage(res.error);
        setValidationResult(null);
      } else {
        setValidationResult(res.validationResult);
      }
    });
  };

  const handleExecuteImport = () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    startTransition(async () => {
      const res = await executeProductImportAction(validationResult.validRows);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to complete product import.");
      } else {
        setImportSuccess(true);
        setImportedSummary({
          imported: res.result.importedCount,
          categories: res.result.categoriesCreatedCount,
        });
      }
    });
  };

  const downloadSampleCsv = () => {
    const sampleHeaders = "Name,SKU,Barcode,Category,Unit,CostPrice,SellingPrice,ReorderLevel,InitialStock";
    const sampleRows = [
      'Arabica Coffee 500g,COF-500G,123456789012,Beverages,pkt,120.00,180.00,10,50',
      'White Teff Flour 50kg,TEFF-50KG,123456789013,Grains,qtl,4200.00,5100.00,5,20',
      'Sunflower Cooking Oil 3L,OIL-3L,123456789014,Groceries,ltr,350.00,430.00,8,40',
      'Laundry Detergent Bar,SOAP-01,123456789015,Household,pcs,45.00,65.00,15,100',
    ];
    const csvData = [sampleHeaders, ...sampleRows].join("\n");
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "easystock_product_import_sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/${shopSlug}/products`}
              className="text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Batch Product CSV Import
          </h1>
          <p className="text-xs text-slate-500">
            Upload your inventory spreadsheet with automated validation, collision detection, and opening stock entry
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={downloadSampleCsv}
          className="flex items-center gap-1.5 self-start text-xs"
        >
          <Download className="h-3.5 w-3.5" /> Download Sample CSV
        </Button>
      </div>

      {/* Success State */}
      {importSuccess && importedSummary && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4 animate-in fade-in">
          <div className="inline-flex p-3 bg-emerald-100 rounded-full text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Import Completed Successfully!</h2>
            <p className="text-sm text-emerald-700 mt-1">
              Successfully imported <strong>{importedSummary.imported}</strong> products into your shop inventory
              {importedSummary.categories > 0 && ` and created ${importedSummary.categories} new categories`}.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Button onClick={() => router.push(`/${shopSlug}/products`)}>
              View Product Catalog
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setImportSuccess(false);
                setValidationResult(null);
                setFileName("");
                setCsvContent("");
              }}
            >
              Upload Another File
            </Button>
          </div>
        </div>
      )}

      {!importSuccess && (
        <>
          {/* Upload Dropzone */}
          <div className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center transition-colors">
            <div className="max-w-md mx-auto space-y-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full inline-flex">
                <Upload className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {fileName ? fileName : "Select or drag your CSV file"}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Accepted format: <code>.csv</code> containing <code>Name, SKU, CostPrice, SellingPrice</code> with optional columns for <code>Barcode, Category, Unit, ReorderLevel, InitialStock</code>.
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-sm transition-colors">
                  Browse CSV File
                </span>
              </label>
            </div>
          </div>

          {/* Pending Validation Spinner */}
          {isPending && !validationResult && (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-600" />
              <p className="text-xs text-slate-600 font-medium">Validating spreadsheet rows & detecting SKU collisions...</p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
              <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Validation Issue</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Validation Results Overview */}
          {validationResult && (
            <div className="space-y-6">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                  <p className="text-xs font-medium text-slate-500">Total Rows Detected</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{validationResult.totalRows}</p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ready to Import
                  </div>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{validationResult.validRowsCount}</p>
                </div>

                <div className={`p-4 rounded-xl border ${validationResult.invalidRowsCount > 0 ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <AlertTriangle className={`h-4 w-4 ${validationResult.invalidRowsCount > 0 ? "text-amber-600" : "text-slate-400"}`} /> Rows with Errors
                  </div>
                  <p className={`text-2xl font-bold mt-1 ${validationResult.invalidRowsCount > 0 ? "text-amber-900" : "text-slate-400"}`}>
                    {validationResult.invalidRowsCount}
                  </p>
                </div>
              </div>

              {/* Error Breakdown Table (if any) */}
              {validationResult.errors.length > 0 && (
                <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Row Validation Errors ({validationResult.errors.length})
                    </div>
                    <span className="text-[11px] text-red-600 font-medium">
                      These rows will be skipped during import
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
                    {validationResult.errors.map((err, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800">
                            Row {err.rowNumber} {err.sku && `(SKU: ${err.sku})`}
                          </span>
                          <p className="text-red-600">{err.message}</p>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-[10px]">
                          Field: {err.field}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Rows Preview Table */}
              {validationResult.validRows.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Previewing Valid Products ({validationResult.validRows.length})
                    </h3>
                    <Button
                      size="sm"
                      onClick={handleExecuteImport}
                      disabled={isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5"
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Import {validationResult.validRows.length} Products
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 sticky top-0 font-semibold">
                        <tr>
                          <th className="p-2.5">SKU</th>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5">Category</th>
                          <th className="p-2.5">Unit</th>
                          <th className="p-2.5 text-right">Cost Price</th>
                          <th className="p-2.5 text-right">Selling Price</th>
                          <th className="p-2.5 text-right">Opening Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {validationResult.validRows.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50/60">
                            <td className="p-2.5 font-mono font-semibold text-slate-900">{r.sku}</td>
                            <td className="p-2.5 font-medium text-slate-800">{r.name}</td>
                            <td className="p-2.5 text-slate-600">{r.category || "—"}</td>
                            <td className="p-2.5 text-slate-500 uppercase">{r.unitOfMeasure}</td>
                            <td className="p-2.5 text-right font-mono text-slate-700">
                              {r.costPrice.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {r.sellingPrice.toFixed(2)}
                            </td>
                            <td className="p-2.5 text-right font-mono font-semibold text-blue-600">
                              {r.initialStock || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
