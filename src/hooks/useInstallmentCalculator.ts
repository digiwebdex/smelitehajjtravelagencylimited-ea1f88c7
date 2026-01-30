/**
 * Installment Calculator Hook
 * Calculate EMI payments for packages
 */

interface InstallmentConfig {
  totalAmount: number;
  minDownPaymentPercent: number;
  maxInstallmentMonths: number;
}

interface InstallmentResult {
  downPayment: number;
  monthlyPayment: number;
  totalPayable: number;
  numberOfMonths: number;
  isValid: boolean;
}

export const useInstallmentCalculator = () => {
  const calculateInstallment = (
    config: InstallmentConfig,
    downPaymentPercent: number,
    months: number
  ): InstallmentResult => {
    const { totalAmount, minDownPaymentPercent, maxInstallmentMonths } = config;

    // Validate inputs
    if (downPaymentPercent < minDownPaymentPercent) {
      return {
        downPayment: 0,
        monthlyPayment: 0,
        totalPayable: totalAmount,
        numberOfMonths: 0,
        isValid: false,
      };
    }

    if (months > maxInstallmentMonths || months < 1) {
      return {
        downPayment: 0,
        monthlyPayment: 0,
        totalPayable: totalAmount,
        numberOfMonths: 0,
        isValid: false,
      };
    }

    // Calculate amounts
    const downPayment = Math.round((totalAmount * downPaymentPercent) / 100);
    const remainingAmount = totalAmount - downPayment;
    const monthlyPayment = Math.round(remainingAmount / months);
    const totalPayable = downPayment + monthlyPayment * months;

    return {
      downPayment,
      monthlyPayment,
      totalPayable,
      numberOfMonths: months,
      isValid: true,
    };
  };

  const getDefaultConfig = (): InstallmentConfig => ({
    totalAmount: 0,
    minDownPaymentPercent: 30,
    maxInstallmentMonths: 6,
  });

  const formatInstallmentPlan = (result: InstallmentResult): string => {
    if (!result.isValid) return "Invalid installment configuration";

    return `Down payment: ৳${result.downPayment.toLocaleString()} + ${result.numberOfMonths} monthly payments of ৳${result.monthlyPayment.toLocaleString()}`;
  };

  return {
    calculateInstallment,
    getDefaultConfig,
    formatInstallmentPlan,
  };
};

export default useInstallmentCalculator;
