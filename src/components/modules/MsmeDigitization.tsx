import React, { useCallback, useEffect, useState } from 'react';
import { FileText, Store, TrendingUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface MsmeStorefront {
  id: number;
  regionCode: string;
  businessName: string;
  category: string;
  udyamSelfReported: string;
  storefrontSlug: string;
  description: string;
  city: string;
  exportReadinessLevel: string;
  isMine: boolean;
}

interface MsmeProduct {
  id: number;
  businessId: number;
  name: string;
  sku: string;
  category: string;
  priceInr: number;
  stockQty: number;
  unit: string;
  description: string;
  isAiGeneratedDescription: boolean;
}

interface MsmeInvoice {
  id: number;
  invoiceNumber: string;
  customerName: string;
  subtotalInr: number;
  gstInr: number;
  totalInr: number;
  status: string;
  issuedAt: string;
}

interface MsmeExpense {
  id: number;
  category: string;
  description: string;
  amountInr: number;
  expenseDate: string;
}

export const MsmeDigitization: React.FC<{ onOpenAi: () => void }> = ({ onOpenAi }) => {
  const { dbUser, selectedRegion, language, authFetch, loginWithGoogle } = useAuth();
  const [storefronts, setStorefronts] = useState<MsmeStorefront[]>([]);
  const [products, setProducts] = useState<MsmeProduct[]>([]);
  const [myBusinesses, setMyBusinesses] = useState<MsmeStorefront[]>([]);
  const [myInvoices, setMyInvoices] = useState<MsmeInvoice[]>([]);
  const [myExpenses, setMyExpenses] = useState<MsmeExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Create Business Form
  const [bizName, setBizName] = useState('');
  const [bizCategory, setBizCategory] = useState('Textiles & Handicrafts');
  const [udyamInput, setUdyamInput] = useState('');
  const [bizCity, setBizCity] = useState('Indore');
  const [bizDesc, setBizDesc] = useState('');
  const [exportLevel, setExportLevel] = useState<'Foundation' | 'Domestic Digital' | 'Export Exploring'>('Domestic Digital');

  // Add Product Form
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('IND-SKU-01');
  const [prodPrice, setProdPrice] = useState('850');
  const [prodStock, setProdStock] = useState('45');
  const [prodUnit, setProdUnit] = useState('piece');
  const [prodDesc, setProdDesc] = useState('');
  const [isAiDesc, setIsAiDesc] = useState(false);

  // Invoice Generator
  const [customerName, setCustomerName] = useState('');
  const [invItemName, setInvItemName] = useState('Maheshwari Cotton Stole');
  const [invQty, setInvQty] = useState('4');
  const [invRate, setInvRate] = useState('850');
  const [gstRate, setGstRate] = useState('12');

  // Expense Form
  const [expCategory, setExpCategory] = useState('Raw Material');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState('2026-11-26');

  // AI MSME Content Assistant
  const [aiGoal, setAiGoal] = useState<'product_description' | 'marketing_post' | 'financial_plan'>('product_description');
  const [aiDetails, setAiDetails] = useState('');
  const [aiOutput, setAiOutput] = useState<{ headline: string; content: string; tips: string[]; disclaimer: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const loadMsme = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/msme/overview?region=${encodeURIComponent(selectedRegion)}`);
      if (res.ok) {
        const data = await res.json();
        setStorefronts(data.storefronts || []);
        setProducts(data.products || []);
        setMyBusinesses(data.myBusinesses || []);
        setMyInvoices(data.myInvoices || []);
        setMyExpenses(data.myExpenses || []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, selectedRegion]);

  useEffect(() => {
    loadMsme();
  }, [loadMsme]);

  const activeBiz = myBusinesses[0] || null;

  const handleCreateBiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const res = await authFetch('/api/msme/businesses', {
        method: 'POST',
        body: JSON.stringify({
          regionCode: selectedRegion,
          businessName: bizName,
          category: bizCategory,
          udyamSelfReported: udyamInput,
          description: bizDesc,
          city: bizCity,
          exportReadinessLevel: exportLevel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create MSME storefront.');
      setMessage(`Storefront "${data.business.businessName}" created.`);
      setBizName('');
      setBizDesc('');
      await loadMsme();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Creation failed.');
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    setError(null);
    try {
      const res = await authFetch('/api/msme/products', {
        method: 'POST',
        body: JSON.stringify({
          businessId: activeBiz.id,
          name: prodName,
          sku: prodSku,
          category: activeBiz.category,
          priceInr: Number(prodPrice),
          stockQty: Number(prodStock),
          unit: prodUnit,
          description: prodDesc,
          isAiGeneratedDescription: isAiDesc,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add product.');
      setProducts((prev) => [data.product, ...prev]);
      setProdName('');
      setProdDesc('');
      setIsAiDesc(false);
      setMessage('Product added to digital catalog.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product add failed.');
    }
  };

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    setError(null);
    try {
      const res = await authFetch('/api/msme/invoices', {
        method: 'POST',
        body: JSON.stringify({
          businessId: activeBiz.id,
          customerName,
          gstRatePercent: Number(gstRate),
          items: [{ name: invItemName, qty: Number(invQty), rateInr: Number(invRate) }],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invoice creation failed.');
      setMyInvoices((prev) => [data.invoice, ...prev]);
      setCustomerName('');
      setMessage(`Invoice ${data.invoice.invoiceNumber} issued (₹${data.invoice.totalInr.toLocaleString('en-IN')}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice error.');
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;
    setError(null);
    try {
      const res = await authFetch('/api/msme/expenses', {
        method: 'POST',
        body: JSON.stringify({
          businessId: activeBiz.id,
          category: expCategory,
          description: expDesc,
          amountInr: Number(expAmount),
          expenseDate: expDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Expense logging failed.');
      setMyExpenses((prev) => [data.expense, ...prev]);
      setExpDesc('');
      setExpAmount('');
      setMessage('Business expense recorded.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Expense error.');
    }
  };

  const handleAiAssist = async () => {
    if (!activeBiz) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await authFetch('/api/msme/ai-assist', {
        method: 'POST',
        body: JSON.stringify({
          businessName: activeBiz.businessName,
          category: activeBiz.category,
          productName: prodName || invItemName || activeBiz.businessName,
          goal: aiGoal,
          language,
          details: aiDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI generation failed.');
      setAiOutput(data.result);
      if (aiGoal === 'product_description' && data.result?.content) {
        setProdDesc(data.result.content.slice(0, 900));
        setIsAiDesc(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI assist failed.');
    } finally {
      setAiBusy(false);
    }
  };

  const totalSales = myInvoices.reduce((s, inv) => s + inv.totalInr, 0);
  const totalExpenses = myExpenses.reduce((s, e) => s + e.amountInr, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Module 03 · MSME Digital Transformation
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            Digital Storefronts, GST Invoicing, Inventory &amp; Export Readiness
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Notice: Business profiles and Udyam entries are self-declared unless verified through an authorized government API integration.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAi}
          className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors"
        >
          Ask MSME Growth AI
        </button>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-sm text-emerald-900 dark:text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-sm text-red-800 dark:text-red-300">
          {error}
        </div>
      )}

      {!dbUser ? (
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Sign in to launch your MSME Storefront, GST Billing &amp; Expense Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage products, stock quantities, GST invoices, and AI marketing drafts in one workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={loginWithGoogle}
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium whitespace-nowrap shrink-0"
          >
            Sign In with Google
          </button>
        </div>
      ) : !activeBiz ? (
        <form
          onSubmit={handleCreateBiz}
          className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
        >
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Create Your MSME Digital Storefront
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Business Name
              <input
                type="text"
                required
                value={bizName}
                onChange={(e) => setBizName(e.target.value)}
                placeholder="e.g., Malwa Handloom Collective"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Category
              <select
                value={bizCategory}
                onChange={(e) => setBizCategory(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option>Textiles &amp; Handicrafts</option>
                <option>Food Processing &amp; Spices</option>
                <option>Precision Engineering &amp; Packaging</option>
                <option>Retail &amp; Wholesale</option>
                <option>IT &amp; Digital Services</option>
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              City
              <input
                type="text"
                required
                value={bizCity}
                onChange={(e) => setBizCity(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Export Readiness Stage
              <select
                value={exportLevel}
                onChange={(e) => setExportLevel(e.target.value as 'Foundation' | 'Domestic Digital' | 'Export Exploring')}
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option>Foundation</option>
                <option>Domestic Digital</option>
                <option>Export Exploring</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Udyam Reference (Optional — Self-Declared Only)
              <input
                type="text"
                value={udyamInput}
                onChange={(e) => setUdyamInput(e.target.value)}
                placeholder="Not govt verified until API integration"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Storefront Description
              <input
                type="text"
                required
                value={bizDesc}
                onChange={(e) => setBizDesc(e.target.value)}
                placeholder="Describe core products, artisan craft, or industrial capabilities..."
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium"
          >
            Launch Digital Storefront
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Business Summary Bar */}
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {activeBiz.category} · {activeBiz.city} · {activeBiz.udyamSelfReported}
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                {activeBiz.businessName}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Storefront URL slug: <span className="font-mono">/store/{activeBiz.storefrontSlug}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Invoiced Sales</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                ₹{totalSales.toLocaleString('en-IN')}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Logged Expenses</div>
              <div className="text-2xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
                ₹{totalExpenses.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Catalog + AI Content Generator */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Product Catalog &amp; AI Copy Assistant
              </h3>

              <div className="p-4 rounded-lg bg-stone-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Gemini MSME Content Drafts
                  </span>
                  <select
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value as typeof aiGoal)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    <option value="product_description">Product Description</option>
                    <option value="marketing_post">Digital Marketing Copy</option>
                    <option value="financial_plan">Working Capital &amp; Pricing Plan</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiDetails}
                    onChange={(e) => setAiDetails(e.target.value)}
                    placeholder="Key features, target buyers, or margin goals..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={handleAiAssist}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-medium whitespace-nowrap shrink-0"
                  >
                    {aiBusy ? 'Generating...' : 'Generate Draft'}
                  </button>
                </div>
                {aiOutput && (
                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {aiOutput.headline}
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">{aiOutput.content}</p>
                    <p className="text-amber-700 dark:text-amber-400">{aiOutput.disclaimer}</p>
                  </div>
                )}
              </div>

              <form onSubmit={handleAddProduct} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    placeholder="Product Name"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="SKU"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="Price (₹)"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                  <input
                    type="number"
                    required
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    placeholder="Stock Qty"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Product description..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium"
                >
                  Add to Inventory
                </button>
              </form>
            </div>

            {/* GST Invoice & Expense Tracker */}
            <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
              <form onSubmit={handleIssueInvoice} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    GST Invoice Generator
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer / Buyer Name"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    type="text"
                    required
                    value={invItemName}
                    onChange={(e) => setInvItemName(e.target.value)}
                    placeholder="Item Name"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    type="number"
                    required
                    value={invQty}
                    onChange={(e) => setInvQty(e.target.value)}
                    placeholder="Qty"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                  <input
                    type="number"
                    required
                    value={invRate}
                    onChange={(e) => setInvRate(e.target.value)}
                    placeholder="Rate (₹)"
                    className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="0">0% GST (Exempt)</option>
                    <option value="5">5% GST</option>
                    <option value="12">12% GST</option>
                    <option value="18">18% GST</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-amber-600 text-white text-sm font-medium"
                  >
                    Issue Invoice
                  </button>
                </div>
              </form>

              <form onSubmit={handleAddExpense} className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-600 dark:text-slate-400" aria-hidden="true" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Log Business Expense
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    placeholder="Expense item"
                    className="col-span-2 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                  <input
                    type="number"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    placeholder="₹ Amount"
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200"
                >
                  Record Expense
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Regional MSME Storefront Directory */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Regional MSME Digital Storefronts &amp; Catalog
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {storefronts.length} storefronts · {products.length} products
          </span>
        </div>

        {loading ? (
          <div className="text-sm text-slate-500">Loading MSME directory...</div>
        ) : storefronts.length === 0 ? (
          <div className="text-sm text-slate-500 py-3">
            No storefronts published in this region yet. Launch the first MSME storefront above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {storefronts.map((s) => (
              <div key={s.id} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {s.category} · {s.city} · {s.exportReadinessLevel}
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {s.businessName}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{s.description}</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">{s.udyamSelfReported}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
