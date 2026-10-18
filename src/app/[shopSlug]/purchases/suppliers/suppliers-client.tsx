"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { NewSupplierModal } from "./new-supplier-modal";
import { ArrowLeft, Users, Plus, Phone, Mail, Building } from "lucide-react";
import { useRouter } from "next/navigation";

interface SupplierItem {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  paymentTerms: string | null;
  createdAt: Date;
}

interface SuppliersClientProps {
  suppliers: SupplierItem[];
  shopSlug: string;
}

export function SuppliersClient({ suppliers, shopSlug }: SuppliersClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/${shopSlug}/purchases`}
            className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 font-medium mb-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Purchasing
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Suppliers Directory</h1>
          <p className="text-sm text-slate-500">
            Manage authorized vendors and procurement payment terms
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="self-start">
          <Plus className="h-4 w-4 mr-1.5" /> Add Supplier
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.length === 0 ? (
          <div className="col-span-full py-16 bg-white border border-slate-200 rounded-xl text-center text-slate-400">
            <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-slate-700">No suppliers registered</p>
            <p className="text-xs mt-1">Add your vendors to begin issuing purchase orders.</p>
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{s.name}</h3>
                  {s.contactName && (
                    <p className="text-xs text-slate-500 font-medium">Attn: {s.contactName}</p>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                  {s.paymentTerms || "Net 30"}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{s.address}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <NewSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
