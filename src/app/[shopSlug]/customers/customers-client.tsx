"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/decimal";
import { Button } from "@/components/ui/button";
import { NewCustomerModal } from "./new-customer-modal";
import { CreditModal } from "./credit-modal";
import { CustomerHistoryModal } from "./customer-history-modal";
import { deleteCustomerAction } from "@/app/actions/customers";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  History,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";

interface CustomerItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  outstandingCredit: number;
  totalSalesCount: number;
  createdAt: Date;
}

interface CustomersClientProps {
  initialCustomers: CustomerItem[];
  shop: {
    id: string;
    currency: string;
  };
}

export function CustomersClient({ initialCustomers, shop }: CustomersClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterCreditOnly, setFilterCreditOnly] = useState(false);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<CustomerItem | null>(null);

  const [creditModalCustomer, setCreditModalCustomer] = useState<CustomerItem | null>(null);
  const [historyModalCustomer, setHistoryModalCustomer] = useState<CustomerItem | null>(null);

  const filteredCustomers = initialCustomers.filter((c) => {
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search)) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

    const matchesCredit = !filterCreditOnly || c.outstandingCredit > 0;

    return matchesSearch && matchesCredit;
  });

  const totalOutstandingCredit = initialCustomers.reduce(
    (sum, c) => sum + (c.outstandingCredit > 0 ? c.outstandingCredit : 0),
    0
  );

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive customer "${name}"?`)) return;
    const res = await deleteCustomerAction(id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || "Failed to delete customer");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory & Accounts
          </h1>
          <p className="text-xs text-slate-500">
            Manage customer relationships, track purchase histories, and oversee outstanding store credit
          </p>
        </div>

        <Button
          onClick={() => {
            setCustomerToEdit(null);
            setIsNewModalOpen(true);
          }}
          className="flex items-center gap-1.5 self-start sm:self-auto bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Customers
          </span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {initialCustomers.length}
          </div>
          <span className="text-[11px] text-slate-400">Registered client accounts</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Accounts with Credit Due
          </span>
          <div className="text-2xl font-extrabold text-amber-600 font-mono">
            {initialCustomers.filter((c) => c.outstandingCredit > 0).length}
          </div>
          <span className="text-[11px] text-slate-400">Customers with pending balances</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Outstanding Credit
          </span>
          <div className="text-2xl font-extrabold text-rose-600 font-mono">
            {formatCurrency(totalOutstandingCredit, shop.currency)}
          </div>
          <span className="text-[11px] text-slate-400">Store receivables balance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or email..."
            className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCreditOnly(!filterCreditOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              filterCreditOnly
                ? "bg-amber-50 border-amber-300 text-amber-800"
                : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Pending Credit Only</span>
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Outstanding Credit</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No customers found</p>
                    <p className="text-slate-400 text-xs">
                      {search ? "Try adjusting your search criteria" : "Register your first customer to begin"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Added {new Date(c.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 space-y-0.5">
                      {c.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">No phone</span>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {c.address ? (
                        <div className="flex items-center gap-1.5 text-slate-600 max-w-xs truncate">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{c.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300">&mdash;</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setHistoryModalCustomer(c)}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <History className="h-3 w-3" />
                        <span>{c.totalSalesCount} sales</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                          c.outstandingCredit > 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-slate-50 text-slate-600"
                        }`}
                      >
                        {formatCurrency(c.outstandingCredit, shop.currency)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setCreditModalCustomer(c)}
                          title="Adjust Credit / Receive Repayment"
                          className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setCustomerToEdit(c);
                            setIsNewModalOpen(true);
                          }}
                          title="Edit Customer Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          title="Archive Customer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewModalOpen}
        onClose={() => {
          setIsNewModalOpen(false);
          setCustomerToEdit(null);
        }}
        onSuccess={() => router.refresh()}
        customerToEdit={customerToEdit}
      />

      {creditModalCustomer && (
        <CreditModal
          isOpen={true}
          onClose={() => setCreditModalCustomer(null)}
          onSuccess={() => router.refresh()}
          customer={creditModalCustomer}
          currency={shop.currency}
        />
      )}

      {historyModalCustomer && (
        <CustomerHistoryModal
          isOpen={true}
          onClose={() => setHistoryModalCustomer(null)}
          customerId={historyModalCustomer.id}
          customerName={historyModalCustomer.name}
          currency={shop.currency}
        />
      )}
    </div>
  );
}
