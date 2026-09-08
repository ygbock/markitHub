import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, Clock, AlertTriangle, Play, RefreshCw, 
  Truck, ShieldCheck, Box, PackageCheck, FileText, CreditCard, 
  MapPin, User, Check, ArrowRight, Sparkles, ChevronDown, 
  ChevronRight, ExternalLink, QrCode, Printer, Undo2, 
  RotateCcw, ThumbsUp, Star, Phone, Camera, PenTool, Database,
  ArrowDown, Info, Lock, Layers, Zap, AlertCircle
} from 'lucide-react';
import { 
  Order, 
  OrderLifecycleDomainStatuses, 
  OrderLifecycleStageRecord, 
  ProofOfDeliveryData,
  WarehouseFulfillmentData,
  ShippingHandoverData,
  LastMileDeliveryData,
  OrderFeedbackReviewData
} from '../../types';
import { 
  ORDER_LIFECYCLE_PHASES, 
  ORDER_LIFECYCLE_STAGES, 
  OrderLifecycleService,
  LifecyclePhaseDefinition,
  LifecycleStageDefinition
} from '../../services/orderLifecycleService';
import { useCurrency } from '../../context/CurrencyContext';

interface OrderLifecycle30StagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onUpdateOrder?: (updatedOrder: Order) => void;
}

export default function OrderLifecycle30StagesModal({
  isOpen,
  onClose,
  order,
  onUpdateOrder
}: OrderLifecycle30StagesModalProps) {
  const { formatAmount } = useCurrency();
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order);
  const [selectedPhaseFilter, setSelectedPhaseFilter] = useState<number | 'all'>('all');
  const [expandedStageId, setExpandedStageId] = useState<number | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeedMs, setSimulationSpeedMs] = useState(800);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Initialize lifecycle when opened with order
  useEffect(() => {
    if (order) {
      if (!order.lifecycleStages || !order.lifecycleDomainStatuses) {
        const init = OrderLifecycleService.initializeOrderLifecycle(order);
        const enriched: Order = {
          ...order,
          lifecycleDomainStatuses: init.domainStatuses,
          lifecycleStages: init.stages,
          currentLifecycleStageId: init.currentStageId,
          currentLifecyclePhaseId: init.currentPhaseId,
          warehouseFulfillment: order.warehouseFulfillment || OrderLifecycleService.createWarehouseFulfillmentData(order),
          shippingHandover: order.shippingHandover || OrderLifecycleService.createShippingHandoverData(order),
          proofOfDelivery: order.proofOfDelivery || OrderLifecycleService.createProofOfDelivery(order)
        };
        setCurrentOrder(enriched);
        if (onUpdateOrder) onUpdateOrder(enriched);
      } else {
        setCurrentOrder(order);
      }
    }
  }, [order]);

  if (!isOpen || !currentOrder) return null;

  const domainStatuses: OrderLifecycleDomainStatuses = currentOrder.lifecycleDomainStatuses || {
    orderStatus: 'Confirmed',
    paymentStatus: 'Paid',
    fulfillmentStatus: 'Allocated',
    shipmentStatus: 'In Transit',
    returnStatus: 'None',
    lastUpdated: new Date().toISOString()
  };

  const stages = currentOrder.lifecycleStages || [];
  const currentStageId = currentOrder.currentLifecycleStageId || 1;
  const completedStagesCount = stages.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedStagesCount / 30) * 100);

  const showToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => setActionSuccessToast(null), 3500);
  };

  // Advance single stage
  const handleAdvanceToNextStage = () => {
    const nextStageId = Math.min(30, currentStageId + 1);
    const updated = OrderLifecycleService.transitionToStage(currentOrder, nextStageId, {
      notes: `Advanced to Stage ${nextStageId} via Lifecycle Control Center`
    });
    setCurrentOrder(updated);
    if (onUpdateOrder) onUpdateOrder(updated);
    setExpandedStageId(nextStageId);
    showToast(`Advanced order to Stage ${nextStageId}: ${ORDER_LIFECYCLE_STAGES[nextStageId - 1]?.name}`);
  };

  // Jump to specific stage
  const handleJumpToStage = (targetStageId: number) => {
    const updated = OrderLifecycleService.transitionToStage(currentOrder, targetStageId, {
      notes: `Jumped to Stage ${targetStageId} via Admin Control`
    });
    setCurrentOrder(updated);
    if (onUpdateOrder) onUpdateOrder(updated);
    setExpandedStageId(targetStageId);
    showToast(`Jumped to Stage ${targetStageId}`);
  };

  // Run full 30-stage automated simulation
  const handleRunFullSimulation = async () => {
    setIsSimulating(true);
    let workingOrder = currentOrder;

    for (let sId = 1; sId <= 30; sId++) {
      workingOrder = OrderLifecycleService.transitionToStage(workingOrder, sId, {
        actorName: ORDER_LIFECYCLE_STAGES[sId - 1]?.recommendedRole,
        notes: `Simulated Stage ${sId} execution`
      });
      setCurrentOrder({ ...workingOrder });
      setExpandedStageId(sId);
      await new Promise(r => setTimeout(r, simulationSpeedMs));
    }

    if (onUpdateOrder && workingOrder) onUpdateOrder(workingOrder);
    setIsSimulating(false);
    showToast('Completed 30-Stage Full Lifecycle Simulation!');
  };

  // Trigger Stage 15 Pick Exception
  const handleTriggerPickException = () => {
    const stage15 = ORDER_LIFECYCLE_STAGES.find(s => s.id === 15);
    const updated = OrderLifecycleService.transitionToStage(currentOrder, 15, {
      customDomainStatuses: {
        fulfillmentStatus: 'Pick Exception'
      },
      notes: 'Item damaged on shelf. Inventory cycle count alert triggered.'
    });
    setCurrentOrder(updated);
    if (onUpdateOrder) onUpdateOrder(updated);
    setExpandedStageId(15);
    showToast('Logged Stage 15: Picking Exception');
  };

  // Trigger Stage 30 Return/Refund
  const handleTriggerReturnLifecycle = () => {
    const updated = OrderLifecycleService.transitionToStage(currentOrder, 30, {
      customDomainStatuses: {
        returnStatus: 'Return Requested'
      },
      notes: 'Customer initiated RMA claim for return and reverse courier pickup.'
    });
    setCurrentOrder(updated);
    if (onUpdateOrder) onUpdateOrder(updated);
    setExpandedStageId(30);
    showToast('Initiated Stage 30: Returns & Refunds Lifecycle');
  };

  const filteredPhases = selectedPhaseFilter === 'all' 
    ? ORDER_LIFECYCLE_PHASES 
    : ORDER_LIFECYCLE_PHASES.filter(p => p.id === selectedPhaseFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-7xl max-h-[94vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Toast Alert */}
        {actionSuccessToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl shadow-xl border border-indigo-400 font-bold text-xs flex items-center gap-2 animate-in slide-in-from-top-4">
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{actionSuccessToast}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black">
              30
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Order-to-Delivery 30-Stage Lifecycle
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Domain-Driven Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Order: <strong className="text-slate-200 font-mono">#{currentOrder.orderNumber || currentOrder.id}</strong></span>
                <span>•</span>
                <span>Customer: <strong className="text-slate-200">{currentOrder.customerName || 'Walk-in Guest'}</strong></span>
                <span>•</span>
                <span>Amount: <strong className="text-emerald-400 font-mono">{formatAmount(currentOrder.total || currentOrder.grandTotal || 0)}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleAdvanceToNextStage}
              disabled={isSimulating || currentStageId >= 30}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              id="btn-advance-stage"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Advance Step ({currentStageId}/30)</span>
            </button>

            <button
              onClick={handleRunFullSimulation}
              disabled={isSimulating}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              id="btn-simulate-30-stages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isSimulating ? 'Simulating...' : 'Run All 30'}</span>
            </button>

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              id="btn-close-lifecycle-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Multi-Domain Status Matrix (Top Bar) */}
        <div className="px-6 py-3 bg-slate-900/90 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs shrink-0">
          
          {/* 1. Order Status */}
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-sky-400" />
              <span>1. Order Domain</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                domainStatuses.orderStatus === 'Completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                domainStatuses.orderStatus === 'Confirmed' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                'bg-slate-800 text-slate-300'
              }`}>
                {domainStatuses.orderStatus}
              </span>
              <span className="text-[9px] text-slate-500">Commercial</span>
            </div>
          </div>

          {/* 2. Payment Status */}
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-400" />
              <span>2. Payment Domain</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                domainStatuses.paymentStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                domainStatuses.paymentStatus === 'Pending Verification' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                domainStatuses.paymentStatus === 'Refunded' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-slate-800 text-slate-300'
              }`}>
                {domainStatuses.paymentStatus}
              </span>
              <span className="text-[9px] text-slate-500">Gateway</span>
            </div>
          </div>

          {/* 3. Fulfillment Status */}
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Box className="w-3 h-3 text-purple-400" />
              <span>3. Fulfillment Domain</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                domainStatuses.fulfillmentStatus === 'QC Passed' || domainStatuses.fulfillmentStatus === 'Fulfilled' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                domainStatuses.fulfillmentStatus === 'Pick Exception' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                domainStatuses.fulfillmentStatus === 'Picking' || domainStatuses.fulfillmentStatus === 'Packing' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                'bg-slate-800 text-slate-300'
              }`}>
                {domainStatuses.fulfillmentStatus}
              </span>
              <span className="text-[9px] text-slate-500">Warehouse</span>
            </div>
          </div>

          {/* 4. Shipment Status */}
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Truck className="w-3 h-3 text-blue-400" />
              <span>4. Shipment Domain</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                domainStatuses.shipmentStatus === 'Delivered' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                domainStatuses.shipmentStatus === 'Out for Delivery' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                domainStatuses.shipmentStatus === 'In Transit' || domainStatuses.shipmentStatus === 'Dispatched' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                'bg-slate-800 text-slate-300'
              }`}>
                {domainStatuses.shipmentStatus}
              </span>
              <span className="text-[9px] text-slate-500">Logistics</span>
            </div>
          </div>

          {/* 5. Return Status */}
          <div className="bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800/80 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <RotateCcw className="w-3 h-3 text-rose-400" />
              <span>5. Return Domain</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-lg font-black text-[11px] ${
                domainStatuses.returnStatus === 'None' ? 'bg-slate-800 text-slate-400' :
                domainStatuses.returnStatus === 'Refund Issued' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}>
                {domainStatuses.returnStatus}
              </span>
              <span className="text-[9px] text-slate-500">RMA Reverse</span>
            </div>
          </div>

        </div>

        {/* Phase Filter Tabs & Progress Bar */}
        <div className="px-6 py-3 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between shrink-0">
          {/* Phase Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              onClick={() => setSelectedPhaseFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedPhaseFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All 8 Phases (30 Stages)
            </button>
            {ORDER_LIFECYCLE_PHASES.map(ph => (
              <button
                key={ph.id}
                onClick={() => setSelectedPhaseFilter(ph.id)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedPhaseFilter === ph.id
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {ph.shortName}
              </button>
            ))}
          </div>

          {/* Progress Bar & Quick Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400">Total Completion:</span>
              <span className="font-mono font-black text-indigo-400 text-xs">{completedStagesCount}/30 ({progressPercent}%)</span>
            </div>
            <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-linear-to-r from-indigo-500 to-emerald-400 transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {/* Quick Exception Trigger Pills */}
            <div className="hidden lg:flex items-center gap-1 pl-2 border-l border-slate-800">
              <button
                onClick={handleTriggerPickException}
                className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                title="Simulate picking exception on warehouse floor"
              >
                Test Pick Exception (Stg 15)
              </button>
              <button
                onClick={handleTriggerReturnLifecycle}
                className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                title="Simulate customer post-delivery RMA return"
              >
                Test RMA Return (Stg 30)
              </button>
            </div>
          </div>
        </div>

        {/* Modal Main Content: 8 Phases & 30 Stages List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-950/30">
          {filteredPhases.map(phase => {
            const phaseStages = ORDER_LIFECYCLE_STAGES.filter(s => s.phaseId === phase.id);
            const phaseCompleted = phaseStages.every(st => {
              const record = stages.find(s => s.stageId === st.id);
              return record?.status === 'completed';
            });

            return (
              <div 
                key={phase.id} 
                className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-lg"
                id={`lifecycle-phase-${phase.id}`}
              >
                {/* Phase Title Bar */}
                <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center">
                      {phase.id}
                    </span>
                    <h3 className="font-extrabold text-sm text-white">
                      {phase.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {phase.description}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      phaseCompleted 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {phaseCompleted ? 'Phase Completed' : 'In Progress / Pending'}
                    </span>
                  </div>
                </div>

                {/* Phase Constituent Stages Grid */}
                <div className="divide-y divide-slate-800/80">
                  {phaseStages.map(stageDef => {
                    const record = stages.find(s => s.stageId === stageDef.id);
                    const isCompleted = record?.status === 'completed';
                    const isInProgress = record?.status === 'in_progress' || stageDef.id === currentStageId;
                    const isException = record?.status === 'exception';
                    const isExpanded = expandedStageId === stageDef.id;

                    return (
                      <div 
                        key={stageDef.id}
                        className={`transition-colors ${
                          isInProgress ? 'bg-indigo-950/20' : isCompleted ? 'bg-slate-900/40 hover:bg-slate-800/30' : 'bg-slate-950/20'
                        }`}
                      >
                        {/* Stage Summary Row */}
                        <div 
                          onClick={() => setExpandedStageId(isExpanded ? null : stageDef.id)}
                          className="px-5 py-3 flex items-center justify-between gap-4 cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Status Indicator Icon */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isCompleted 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                : isException
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                                : isInProgress
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 animate-pulse'
                                : 'bg-slate-800 text-slate-500'
                            }`}>
                              {isCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : isException ? (
                                <AlertTriangle className="w-4 h-4" />
                              ) : isInProgress ? (
                                <Zap className="w-4 h-4" />
                              ) : (
                                <Clock className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className={`text-xs font-bold ${isInProgress ? 'text-indigo-300' : 'text-slate-200'}`}>
                                  {stageDef.name}
                                </h4>
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-800 text-slate-400">
                                  {stageDef.systemDomain}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 truncate max-w-xl">
                                {stageDef.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {/* Role badge */}
                            <span className="hidden md:inline-block text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                              {stageDef.recommendedRole}
                            </span>

                            {/* Trigger Jump Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleJumpToStage(stageDef.id);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 transition-colors"
                            >
                              Set Active
                            </button>

                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                        </div>

                        {/* Stage Expanded Details & Sub-Panels */}
                        {isExpanded && (
                          <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 bg-slate-950/40 text-xs space-y-4 animate-in fade-in">
                            
                            {/* Domain Status Impacts & Key Artifacts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                                <div className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Domain Status Transitions Triggered</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(stageDef.domainStatusImpact).map(([k, v]) => (
                                    <span key={k} className="px-2 py-1 bg-slate-800 text-indigo-300 rounded-lg font-mono text-[10px] font-bold border border-slate-700">
                                      {k}: <strong>{v}</strong>
                                    </span>
                                  ))}
                                  {Object.keys(stageDef.domainStatusImpact).length === 0 && (
                                    <span className="text-slate-500 text-[10px]">No direct domain status mutation (Internal verification step)</span>
                                  )}
                                </div>
                              </div>

                              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                                <div className="font-bold text-slate-300 flex items-center gap-1.5 text-[11px]">
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Key System Artifacts & Deliverables</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {stageDef.keyArtifacts.map((art, aIdx) => (
                                    <span key={aIdx} className="px-2 py-1 bg-emerald-950/40 text-emerald-300 rounded-lg text-[10px] font-semibold border border-emerald-800/40">
                                      ✓ {art}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* SPECIALIZED STAGE PANELS */}
                            {/* 1. Stage 14/15/16/17 (Warehouse WMS: Pick, Pack, QC) */}
                            {(stageDef.id === 14 || stageDef.id === 16 || stageDef.id === 17) && currentOrder.warehouseFulfillment && (
                              <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl space-y-3">
                                <div className="font-bold text-purple-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Box className="w-4 h-4 text-purple-400" />
                                    <span>Warehouse WMS Operations Detail ({currentOrder.warehouseFulfillment.assignedWarehouseName})</span>
                                  </span>
                                  <span className="font-mono text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-md">
                                    Task: {currentOrder.warehouseFulfillment.pickTaskId}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                                    <span className="text-slate-500 block">Picker Lead:</span>
                                    <strong className="text-slate-200">{currentOrder.warehouseFulfillment.pickerStaffName}</strong>
                                    <span className="text-[10px] text-emerald-400 block mt-1">✓ Barcode Scanned Verified</span>
                                  </div>

                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                                    <span className="text-slate-500 block">Packaging Specifications:</span>
                                    <strong className="text-slate-200">{currentOrder.warehouseFulfillment.packageDetails?.boxType}</strong>
                                    <span className="text-[10px] text-slate-400 block mt-1">
                                      Gross Weight: {currentOrder.warehouseFulfillment.packageDetails?.grossWeightKg} kg
                                    </span>
                                  </div>

                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                                    <span className="text-slate-500 block">QA Quality Control:</span>
                                    <strong className="text-slate-200">{currentOrder.warehouseFulfillment.qcInspection?.inspectorName}</strong>
                                    <span className="text-[10px] text-emerald-400 block mt-1">
                                      Seal: {currentOrder.warehouseFulfillment.qcInspection?.tamperSealNumber}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 2. Stage 18/19/20 (Shipping & Courier Handover) */}
                            {(stageDef.id === 18 || stageDef.id === 19 || stageDef.id === 20) && currentOrder.shippingHandover && (
                              <div className="p-4 bg-blue-950/30 border border-blue-800/40 rounded-2xl space-y-3">
                                <div className="font-bold text-blue-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <Truck className="w-4 h-4 text-blue-400" />
                                    <span>Shipping Manifest & Carrier Handover Details</span>
                                  </span>
                                  <span className="font-mono text-[10px] bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded-md">
                                    Tracking: {currentOrder.shippingHandover.trackingNumber}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Carrier:</span>
                                      <strong className="text-slate-200">{currentOrder.shippingHandover.carrierName}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Assigned Driver:</span>
                                      <strong className="text-slate-200">{currentOrder.shippingHandover.courierDriverName} ({currentOrder.shippingHandover.courierDriverPhone})</strong>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Vehicle License:</span>
                                      <span className="font-mono text-slate-300">{currentOrder.shippingHandover.vehiclePlate}</span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800">
                                      <span>Dock Handover:</span>
                                      <span>Confirmed by {currentOrder.shippingHandover.warehouseHandoverConfirmedBy}</span>
                                    </div>
                                  </div>

                                  {/* Code-128 Shipping Label Preview */}
                                  <div className="bg-white p-3 rounded-xl text-slate-950 flex flex-col items-center justify-center text-center">
                                    <span className="text-[10px] font-bold text-slate-500 mb-1">OPTICAL SHIPPING LABEL (CODE-128)</span>
                                    <div 
                                      className="w-full flex justify-center"
                                      dangerouslySetInnerHTML={{ __html: currentOrder.shippingHandover.shippingLabelBarcodeSvg || '' }}
                                    />
                                    <span className="text-[9px] font-mono text-slate-600 mt-1">
                                      * {currentOrder.shippingHandover.trackingNumber} *
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 3. Stage 24/25 (Last-Mile & Proof of Delivery) */}
                            {(stageDef.id === 24 || stageDef.id === 25) && currentOrder.proofOfDelivery && (
                              <div className="p-4 bg-teal-950/30 border border-teal-800/40 rounded-2xl space-y-3">
                                <div className="font-bold text-teal-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                                    <span>Proof of Delivery (POD) Cryptographic Verification</span>
                                  </span>
                                  <span className="font-mono text-[10px] bg-teal-900/60 text-teal-300 px-2 py-0.5 rounded-md">
                                    POD ID: {currentOrder.proofOfDelivery.podId}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                    <span className="text-slate-500 block">Recipient Verification:</span>
                                    <strong className="text-slate-200 block">{currentOrder.proofOfDelivery.recipientName}</strong>
                                    <span className="text-emerald-400 font-bold block text-[10px]">
                                      ✓ 6-Digit OTP: {currentOrder.proofOfDelivery.deliveryOtpCode} (Verified)
                                    </span>
                                  </div>

                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                    <span className="text-slate-500 block">GPS Coordinates:</span>
                                    <span className="font-mono text-slate-300 block text-[10px]">
                                      {currentOrder.proofOfDelivery.gpsCoordinates?.latitude}° N, {currentOrder.proofOfDelivery.gpsCoordinates?.longitude}° W
                                    </span>
                                    <span className="text-[10px] text-slate-400 block">
                                      Accuracy: ±{currentOrder.proofOfDelivery.gpsCoordinates?.accuracyMeters}m geofenced
                                    </span>
                                  </div>

                                  <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                                    <span className="text-slate-500 block">Digital Signature:</span>
                                    <div className="h-9 bg-white/90 rounded-lg p-1 flex items-center justify-center">
                                      <div 
                                        className="h-full"
                                        dangerouslySetInnerHTML={{ __html: currentOrder.proofOfDelivery.signatureDataUrl || '' }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 4. Stage 26 (Immutable Ledger Stock Journal) */}
                            {stageDef.id === 26 && (
                              <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-2xl space-y-2 text-[11px]">
                                <div className="font-bold text-amber-200 flex items-center gap-1.5">
                                  <Database className="w-4 h-4 text-amber-400" />
                                  <span>General Ledger Final Stock Depletion Journal</span>
                                </div>
                                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1">
                                  <div className="flex justify-between text-slate-400">
                                    <span>DEBIT: Cost of Goods Sold (COGS 5010)</span>
                                    <span className="text-emerald-400">+{formatAmount((currentOrder.total || 0) * 0.65)}</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400">
                                    <span>CREDIT: Finished Goods Inventory (Asset 1300)</span>
                                    <span className="text-rose-400">-{formatAmount((currentOrder.total || 0) * 0.65)}</span>
                                  </div>
                                  <div className="text-slate-500 pt-1 border-t border-slate-800">
                                    Status: Permanent Immutable Post • Reference: JRN-STK-{currentOrder.id.slice(-6)}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* 5. Stage 30 (Reverse Logistics & Return) */}
                            {stageDef.id === 30 && (
                              <div className="p-4 bg-rose-950/30 border border-rose-800/40 rounded-2xl space-y-2 text-[11px]">
                                <div className="font-bold text-rose-200 flex items-center justify-between">
                                  <span className="flex items-center gap-1.5">
                                    <RotateCcw className="w-4 h-4 text-rose-400" />
                                    <span>Post-Delivery RMA Return & Reverse Logistics Control</span>
                                  </span>
                                  <span className="px-2 py-0.5 bg-rose-900 text-rose-200 rounded text-[10px] font-bold">
                                    {domainStatuses.returnStatus}
                                  </span>
                                </div>
                                <p className="text-slate-300">
                                  Coordinates reverse courier pickup, condition inspection at central warehouse, inventory restocking, and financial refund issuance.
                                </p>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 text-xs">
          <div className="text-slate-400 text-[11px] text-center sm:text-left">
            <span className="text-slate-200 font-bold">Architecture Guardrail:</span> Maintaining separate status across Order, Payment, Fulfillment, Shipment, and Return prevents invalid multi-state collisions.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors cursor-pointer"
            >
              Close Lifecycle View
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
