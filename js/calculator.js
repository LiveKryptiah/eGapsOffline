/* ==========================================================================
   eRPAS Valuation Engine - Philippine Real Property Assessment Calculator
   ========================================================================== */

window.RPAS_Calculator = {
  formatCurrency(num) {
    if (isNaN(num) || num === null || num === undefined) return "₱ 0.00";
    return "₱ " + Number(num).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  formatNumber(num) {
    if (isNaN(num) || num === null || num === undefined) return "0.00";
    return Number(num).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  calculateLand(area, unitValue, adjustmentPercent = 0, assessmentLevelPercent = 20) {
    const a = parseFloat(area) || 0;
    const uv = parseFloat(unitValue) || 0;
    const adj = parseFloat(adjustmentPercent) || 0;
    const al = parseFloat(assessmentLevelPercent) || 0;

    const baseMarketValue = a * uv;
    const adjustedMarketValue = baseMarketValue * (1 + (adj / 100));
    const assessedValue = Math.round(adjustedMarketValue * (al / 100));

    return {
      baseMarketValue,
      adjustedMarketValue,
      assessedValue,
      assessmentLevelPercent: al
    };
  },

  calculateBuilding(floorArea, unitValue, depreciationPercent = 0, assessmentLevelPercent = 30) {
    const area = parseFloat(floorArea) || 0;
    const uv = parseFloat(unitValue) || 0;
    const dep = parseFloat(depreciationPercent) || 0;
    const al = parseFloat(assessmentLevelPercent) || 0;

    const replacementCostNew = area * uv;
    const depreciatedMarketValue = replacementCostNew * (1 - (dep / 100));
    const assessedValue = Math.round(depreciatedMarketValue * (al / 100));

    return {
      replacementCostNew,
      depreciatedMarketValue,
      assessedValue,
      assessmentLevelPercent: al
    };
  },

  calculateMachine(originalCost, depreciationPercent = 0, assessmentLevelPercent = 80) {
    const cost = parseFloat(originalCost) || 0;
    const dep = parseFloat(depreciationPercent) || 0;
    const al = parseFloat(assessmentLevelPercent) || 0;

    const depreciatedMarketValue = cost * (1 - (dep / 100));
    const assessedValue = Math.round(depreciatedMarketValue * (al / 100));

    return {
      originalCost: cost,
      depreciatedMarketValue,
      assessedValue,
      assessmentLevelPercent: al
    };
  }
};
