import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface CalculatorProps {
  onSecretCode: () => void;
}

const Calculator: React.FC<CalculatorProps> = ({ onSecretCode }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [secretInput, setSecretInput] = useState('');

  const inputNumber = (num: string) => {
    const newSecretInput = secretInput + num;
    setSecretInput(newSecretInput);
    
    // Check for secret code
    if (newSecretInput === '101010') {
      onSecretCode();
      return;
    } else if (newSecretInput.length > 6) {
      setSecretInput(num);
    }

    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
    setSecretInput('');
  };

  const calculate = (firstValue: number, secondValue: number, operation: string): number => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '−':
        return firstValue - secondValue;
      case '×':
        return firstValue * secondValue;
      case '÷':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
    setSecretInput('');
  };

  const clearDisplay = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
    setSecretInput('');
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const formatDisplay = (value: string) => {
    if (value.length > 9) {
      const num = parseFloat(value);
      if (Math.abs(num) >= 1000000000) {
        return num.toExponential(5);
      }
      return num.toPrecision(6);
    }
    return value;
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Display */}
      <div className="flex-1 flex items-end justify-end p-6">
        <div className="text-right">
          <div className="text-7xl font-thin text-white">
            {formatDisplay(display)}
          </div>
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-4 gap-2 p-4">
        {/* Row 1 */}
        <Button 
          onClick={clearDisplay}
          className="h-20 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black text-2xl font-medium"
        >
          AC
        </Button>
        <Button 
          onClick={toggleSign}
          className="h-20 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black text-2xl font-medium"
        >
          ±
        </Button>
        <Button 
          onClick={inputPercent}
          className="h-20 rounded-full bg-neutral-400 hover:bg-neutral-300 text-black text-2xl font-medium"
        >
          %
        </Button>
        <Button 
          onClick={() => inputOperation('÷')}
          className="h-20 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-normal"
        >
          ÷
        </Button>

        {/* Row 2 */}
        <Button 
          onClick={() => inputNumber('7')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          7
        </Button>
        <Button 
          onClick={() => inputNumber('8')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          8
        </Button>
        <Button 
          onClick={() => inputNumber('9')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          9
        </Button>
        <Button 
          onClick={() => inputOperation('×')}
          className="h-20 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-normal"
        >
          ×
        </Button>

        {/* Row 3 */}
        <Button 
          onClick={() => inputNumber('4')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          4
        </Button>
        <Button 
          onClick={() => inputNumber('5')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          5
        </Button>
        <Button 
          onClick={() => inputNumber('6')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          6
        </Button>
        <Button 
          onClick={() => inputOperation('−')}
          className="h-20 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-normal"
        >
          −
        </Button>

        {/* Row 4 */}
        <Button 
          onClick={() => inputNumber('1')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          1
        </Button>
        <Button 
          onClick={() => inputNumber('2')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          2
        </Button>
        <Button 
          onClick={() => inputNumber('3')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          3
        </Button>
        <Button 
          onClick={() => inputOperation('+')}
          className="h-20 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-normal"
        >
          +
        </Button>

        {/* Row 5 */}
        <Button 
          onClick={() => inputNumber('0')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal col-span-2"
        >
          0
        </Button>
        <Button 
          onClick={() => setDisplay(display.includes('.') ? display : display + '.')}
          className="h-20 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-2xl font-normal"
        >
          .
        </Button>
        <Button 
          onClick={performCalculation}
          className="h-20 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-normal"
        >
          =
        </Button>
      </div>
    </div>
  );
};

export default Calculator;