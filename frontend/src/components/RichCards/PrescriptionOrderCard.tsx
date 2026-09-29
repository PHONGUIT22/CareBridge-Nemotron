'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faTruckFast,
  faPills,
  faXmark,
  faArrowRight,
  faReceipt,
} from '@fortawesome/free-solid-svg-icons';
import { AmazonRefillOrder } from '../../types';

export interface PrescriptionOrderCardProps {
  isOpen: boolean;
  onClose: () => void;
  order?: AmazonRefillOrder | null;
  onTrackOrder?: (orderId: string) => void;
}

export type PharmacyOrderCardProps = PrescriptionOrderCardProps;
export type AmazonOrderCardProps = PrescriptionOrderCardProps;

/**
 * Prescription Refill Order Rich Card
 * Displays automated 1-click refill status, order ID, delivery estimate, and copay summary.
 */
export function PrescriptionOrderCard({
  isOpen,
  onClose,
  order,
  onTrackOrder,
}: PrescriptionOrderCardProps) {
  if (!isOpen) return null;

  const orderId = order?.orderId || 'CB-7294821-4928103';
  const medicineName = order?.medicineName || 'Atorvastatin (Lipitor)';
  const dosage = order?.dosage || '20mg - Evening';
  const quantity = order?.quantityAdded || 30;
  const newStock = order?.newStockCount ?? 33;
  const deliveryStr = order?.estimatedDelivery || 'Wednesday, Oct 28 (Express Two-Day)';
  const price = order?.totalPrice || '$12.50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0a101d]/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111827] border-2 border-[#10B981]/40 w-full max-w-md rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        {/* Top subtle glow accent (NVIDIA Green / CareBridge Emerald glow) */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#76B900]/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-[#10B981]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-[#1f2937] hover:bg-white/10 text-slate-400 hover:text-white transition-colors z-10"
          title="Close card"
        >
          <FontAwesomeIcon icon={faXmark} className="text-base" />
        </button>

        {/* 1. Header: Prescription Refill Order & Express Badge */}
        <div className="flex items-center justify-between pr-8 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1f2937] border border-[#10B981]/40 flex items-center justify-center text-[#10B981] text-sm">
              <FontAwesomeIcon icon={faPills} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white tracking-tight">
                  Prescription Refill Order
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#76B900]" />
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Smart Pharmacy Refill Hub</p>
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-mono font-semibold flex items-center gap-1.5">
            <FontAwesomeIcon icon={faTruckFast} className="text-xs" />
            <span>Express 2-Day</span>
          </div>
        </div>

        {/* 2. Confirmation Banner */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faCircleCheck} className="text-base" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-emerald-300">Prescription Refill Placed</h3>
            <p className="text-[11px] text-slate-300 font-mono mt-0.5">
              Order #{orderId}
            </p>
          </div>
        </div>

        {/* 3. Prescription Details Container */}
        <div className="space-y-2.5 mb-5 text-xs">
          {/* Medicine & Quantity */}
          <div className="p-3 rounded-xl bg-[#1f2937]/70 border border-white/[0.08] flex items-center justify-between">
            <div>
              <p className="font-semibold text-white text-sm">{medicineName}</p>
              <p className="text-slate-400 mt-0.5">{dosage}</p>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded-md bg-[#111827] border border-white/10 font-mono text-xs font-medium text-slate-200">
                +{quantity} Tablets
              </span>
              <p className="text-[11px] text-emerald-400 font-mono mt-1">
                Stock updated: {newStock} pills
              </p>
            </div>
          </div>

          {/* Delivery & Shipping */}
          <div className="p-3 rounded-xl bg-[#1f2937]/70 border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faTruckFast} className="text-[#10B981] text-sm" />
              <div>
                <p className="font-medium text-white">Estimated Delivery</p>
                <p className="text-slate-400 font-mono text-[11px]">{deliveryStr}</p>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-emerald-400">FREE</span>
          </div>

          {/* Price & Payment */}
          <div className="p-3 rounded-xl bg-[#1f2937]/70 border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faReceipt} className="text-amber-400 text-sm" />
              <div>
                <p className="font-medium text-white">Copay / Order Total</p>
                <p className="text-slate-400 font-mono text-[11px]">Medicare Copay •••• 4012</p>
              </div>
            </div>
            <span className="text-base font-semibold text-white font-mono tabular-nums">
              {price}
            </span>
          </div>
        </div>

        {/* 4. Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (onTrackOrder) onTrackOrder(orderId);
              onClose();
            }}
            className="flex-1 py-2.5 px-4 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#10B981]/20 active:scale-95"
          >
            <span>Track Refill Order</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </button>

          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-[#1f2937] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white font-medium text-xs transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export const AmazonOrderCard = PrescriptionOrderCard;
export const PharmacyOrderCard = PrescriptionOrderCard;
