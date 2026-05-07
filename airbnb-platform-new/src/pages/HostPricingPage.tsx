import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Plus,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { hostAPI } from '@/services/api';
import { LoadingState, ErrorState } from '@/components';
import { cn } from '@/utils/cn';
import { dateKey, formatLocalDate } from '@/utils/helpers';
import type {
  CreatePricingRuleInput,
  HostProperty,
  PricingRule,
  PricingRuleType,
} from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RULE_TYPE_OPTIONS: { value: PricingRuleType; label: string }[] = [
  { value: 'percentage_increase', label: 'Percentage increase (%)' },
  { value: 'percentage_decrease', label: 'Percentage decrease (%)' },
  { value: 'fixed_increase', label: 'Fixed increase ($)' },
  { value: 'fixed_decrease', label: 'Fixed decrease ($)' },
];

const isPercentageRule = (t: PricingRuleType): boolean =>
  t === 'percentage_increase' || t === 'percentage_decrease';

const isIncreaseRule = (t: PricingRuleType): boolean =>
  t === 'percentage_increase' || t === 'fixed_increase';

/**
 * Render the human-readable effect badge text. We deliberately format
 * percentages with up to 2 decimals (the schema is DECIMAL(10,2)) but trim
 * trailing zeros so "+15%" stays "+15%" and "+15.5%" stays "+15.5%".
 */
const formatRuleEffect = (rule: PricingRule): string => {
  const numericValue =
    typeof rule.value === 'string' ? parseFloat(rule.value) : rule.value;
  const sign = isIncreaseRule(rule.rule_type) ? '+' : '-';
  if (isPercentageRule(rule.rule_type)) {
    // Up to 2 decimals, no trailing zeros.
    const trimmed = parseFloat(numericValue.toFixed(2)).toString();
    return `${sign}${trimmed}%`;
  }
  // Fixed amounts — money format, no fractional cents because the UI elsewhere
  // displays prices without cents (formatCurrency uses minimumFractionDigits: 0).
  const rounded = Math.round(numericValue);
  return `${sign}$${rounded}`;
};

/**
 * Truthy check that handles MySQL's 0/1 booleans.
 *
 * mysql2 may return TINYINT(1) as a boolean, a number (0/1), or a string
 * ('0'/'1') depending on the driver version and connection options. We accept
 * all three so a `'1'` string isn't silently treated as inactive.
 */
const isActive = (v: PricingRule['is_active']): boolean =>
  v === true || v === 1 || v === '1';

// ---------------------------------------------------------------------------
// Add Pricing Rule modal
// ---------------------------------------------------------------------------

interface AddPricingRuleModalProps {
  open: boolean;
  propertyId: number;
  onClose: () => void;
  onCreated: () => void;
}

const AddPricingRuleModal = ({
  open,
  propertyId,
  onClose,
  onCreated,
}: AddPricingRuleModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [ruleType, setRuleType] =
    useState<PricingRuleType>('percentage_increase');
  // String-typed because <input type="number"> emits strings; we coerce on submit.
  const [valueStr, setValueStr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  // Reset on open + a11y wiring (focus capture, restore, inert root, esc).
  useEffect(() => {
    if (!open) return;
    setName('');
    setDescription('');
    // Default startDate = today, endDate = +7 days. Keeps the easy case
    // (one-week promotion) one click away.
    const today = new Date();
    setStartDate(dateKey(today));
    const week = new Date(today);
    week.setDate(today.getDate() + 7);
    setEndDate(dateKey(week));
    setRuleType('percentage_increase');
    setValueStr('');
    setSubmitting(false);
    setError(null);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');
    const t = window.setTimeout(() => nameInputRef.current?.focus(), 0);

    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!startDate || !endDate) {
      setError('Pick a start and end date.');
      return;
    }
    if (endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    const numericValue = parseFloat(valueStr);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError('Value must be greater than 0.');
      return;
    }
    if (isPercentageRule(ruleType) && numericValue > 100) {
      setError('Percentage values must be 100 or less.');
      return;
    }

    const payload: CreatePricingRuleInput = {
      name: trimmedName,
      description: description.trim() || undefined,
      startDate,
      endDate,
      ruleType,
      value: numericValue,
    };

    setSubmitting(true);
    try {
      await hostAPI.addPricingRule(propertyId, payload);
      onCreated();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create rule';
      setError(message);
      setSubmitting(false);
    }
  };

  const valueSuffix = isPercentageRule(ruleType) ? '%' : null;
  const valuePrefix = isPercentageRule(ruleType) ? null : '$';
  const valueStep = isPercentageRule(ruleType) ? '0.5' : '1';
  const valueMax = isPercentageRule(ruleType) ? 100 : undefined;

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pricing-rule-title"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div>
            <h2
              id="add-pricing-rule-title"
              className="text-lg font-semibold text-gray-900"
            >
              Add pricing rule
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Adjust nightly price for a date range (e.g. holidays, off-season).
            </p>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 -mt-1 -mr-1 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Name
            </span>
            <input
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              required
              maxLength={100}
              placeholder="e.g. Christmas week, Summer discount"
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Description{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              maxLength={500}
              rows={2}
              placeholder="Internal note for your records"
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                Start date
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={submitting}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">
                End date
              </span>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={submitting}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Rule type
            </span>
            <select
              value={ruleType}
              onChange={(e) =>
                setRuleType(e.target.value as PricingRuleType)
              }
              disabled={submitting}
              className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {RULE_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">
              Value
            </span>
            <div className="mt-1 relative">
              {valuePrefix && (
                <span
                  className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-sm pointer-events-none"
                  aria-hidden="true"
                >
                  {valuePrefix}
                </span>
              )}
              <input
                type="number"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                disabled={submitting}
                required
                min="0"
                max={valueMax}
                step={valueStep}
                placeholder={isPercentageRule(ruleType) ? '15' : '50'}
                className={cn(
                  'block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary',
                  valuePrefix && 'pl-7',
                  valueSuffix && 'pr-7'
                )}
              />
              {valueSuffix && (
                <span
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 text-sm pointer-events-none"
                  aria-hidden="true"
                >
                  {valueSuffix}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {isPercentageRule(ruleType)
                ? 'Percentage between 0 and 100. Decimals allowed.'
                : 'Fixed dollar amount. Whole numbers recommended.'}
            </p>
          </label>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Adding...' : 'Add rule'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Delete Pricing Rule modal
// ---------------------------------------------------------------------------

interface DeletePricingRuleModalProps {
  open: boolean;
  rule: PricingRule | null;
  onClose: () => void;
  onDeleted: () => void;
}

const DeletePricingRuleModal = ({
  open,
  rule,
  onClose,
  onDeleted,
}: DeletePricingRuleModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setError(null);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    if (root) root.setAttribute('inert', '');
    const t = window.setTimeout(() => confirmRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      if (root) root.removeAttribute('inert');
      previouslyFocused?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open || !rule) return null;

  const handleBackdropClick = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !submitting) onClose();
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await hostAPI.deletePricingRule(rule.id);
      onDeleted();
      onClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete rule';
      setError(message);
      setSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-xl max-w-md w-full shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pricing-rule-title"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2
                id="delete-pricing-rule-title"
                className="text-lg font-semibold text-gray-900"
              >
                Delete pricing rule?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                This rule will stop affecting future bookings. Bookings already
                made keep their original price.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 -mt-1 -mr-1 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="font-medium text-gray-900">{rule.name}</p>
            <p className="text-sm text-gray-600 mt-0.5">
              {formatLocalDate(rule.start_date, 'MMM d')} -{' '}
              {formatLocalDate(rule.end_date, 'MMM d, yyyy')}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Effect:{' '}
              <span
                className={cn(
                  'font-medium',
                  isIncreaseRule(rule.rule_type)
                    ? 'text-green-700'
                    : 'text-red-700'
                )}
              >
                {formatRuleEffect(rule)}
              </span>
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Deleting...' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * P4-T3: pricing-rules manager. Sibling of HostCalendarPage — same shell,
 * same a11y patterns, same `parseLocalDate` helper.
 *
 * TODO (future enhancement):
 *   - Edit rule in place (today the host has to delete + re-add).
 *   - Toggle is_active without deleting (backend `addPricingRule` doesn't
 *     accept `is_active`; deletion is the only "off" mechanism today).
 *   - Filtering / search across rules.
 */
export const HostPricingPage = () => {
  const { propertyId: propertyIdRaw } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const propertyId = Number(propertyIdRaw);
  const propertyIdValid = Number.isInteger(propertyId) && propertyId > 0;

  const [property, setProperty] = useState<HostProperty | null>(null);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [ownershipLoading, setOwnershipLoading] = useState(true);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PricingRule | null>(null);

  // Effect 1: ownership check.
  useEffect(() => {
    if (!propertyIdValid) {
      setOwnershipLoading(false);
      setError('Invalid property id.');
      return;
    }
    let cancelled = false;
    setOwnershipLoading(true);
    setError(null);
    hostAPI
      .getProperties()
      .then((props) => {
        if (cancelled) return;
        const match = props.find((p) => p.id === propertyId) ?? null;
        if (!match) {
          setError('You do not have access to this property.');
          setProperty(null);
        } else {
          setProperty(match);
        }
        setOwnershipLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to verify property access');
        setProperty(null);
        setOwnershipLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdValid, reloadKey]);

  // Effect 2: rules fetch. Gated on ownership being resolved.
  useEffect(() => {
    if (!propertyIdValid || !property) return;
    let cancelled = false;
    setRulesLoading(true);
    hostAPI
      .getPricingRules(propertyId)
      .then((rows) => {
        if (cancelled) return;
        // Sort newest-first by created_at DESC. created_at is an ISO string,
        // so a lexical compare works because the format is fixed-width.
        const sorted = [...rows].sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        );
        setRules(sorted);
        setRulesLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load pricing rules');
        setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId, propertyIdValid, property, reloadKey]);

  const loading = ownershipLoading || (property !== null && rulesLoading);

  if (!propertyIdValid) {
    return (
      <ErrorState
        message="Invalid property id."
        onRetry={() => navigate('/host/dashboard')}
      />
    );
  }

  if (loading) {
    return <LoadingState label="Loading pricing rules..." />;
  }

  if (error || !property) {
    return (
      <ErrorState
        message={error ?? 'Could not load pricing rules.'}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  const refetch = () => setReloadKey((k) => k + 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/host/dashboard"
            className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-primary mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Pricing rules — {property.title}
              </h1>
              <p className="text-gray-600 mt-1 text-sm">
                {property.city}, {property.country}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add rule
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-card p-4 sm:p-6">
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <Tag className="w-6 h-6 text-gray-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">
                No pricing rules yet
              </h2>
              <p className="text-sm text-gray-600 mt-1 max-w-sm mx-auto">
                Add a rule to bump prices for high-demand dates or discount
                slow seasons.
              </p>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add your first rule
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {rules.map((rule) => {
                const active = isActive(rule.is_active);
                const increase = isIncreaseRule(rule.rule_type);
                return (
                  <li
                    key={rule.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-3 flex-wrap"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">
                          {rule.name}
                        </p>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                            increase
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          )}
                        >
                          {formatRuleEffect(rule)}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                            active
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-gray-50 text-gray-500 border border-gray-200'
                          )}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {rule.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {rule.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-700 mt-1">
                        {/* Use parseLocalDate-aware formatter to avoid UTC
                            drift — same approach as HostCalendarPage. */}
                        {formatLocalDate(rule.start_date, 'MMM d')} -{' '}
                        {formatLocalDate(rule.end_date, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(rule)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete rule"
                      aria-label={`Delete rule ${rule.name}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <AddPricingRuleModal
        open={addModalOpen}
        propertyId={propertyId}
        onClose={() => setAddModalOpen(false)}
        onCreated={refetch}
      />

      <DeletePricingRuleModal
        open={deleteTarget !== null}
        rule={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={refetch}
      />
    </div>
  );
};

