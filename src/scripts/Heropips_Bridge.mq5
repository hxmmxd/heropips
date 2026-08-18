//+------------------------------------------------------------------+
//|                                              Heropips_Bridge.mq5 |
//|                                         Copyright 2024, Heropips |
//|                                             https://heropips.com |
//+------------------------------------------------------------------+
#property copyright "Heropips"
#property link      "https://heropips.com"
#property version   "2.00"

#include <Trade\Trade.mqh>

enum ENUM_TIMEFRAMES {
   TF_1M = 1,   // 1 Minute
   TF_5M = 5,   // 5 Minutes
   TF_15M = 15, // 15 Minutes
   TF_30M = 30, // 30 Minutes
   TF_1H = 60   // 1 Hour
};

input string           InpCsvUrl      = "http://103.209.146.94/api/mt5-bridge/csv"; // Utho API URL
input ENUM_TIMEFRAMES  InpTimeframe   = TF_1H; // AI Signal Timeframe
input double           InpRiskPercent = 1.0;   // Risk Per Trade (e.g., 1.0 = 1%)
input double           InpStopLoss    = 50;    // Stop Loss (in Pips)
input double           InpTakeProfit  = 100;   // Take Profit (in Pips)
input double           InpFixedLot    = 0.1;   // Fixed Lot Size (Used if Risk% is 0)
input ulong            InpMagicNum    = 12345; // Magic Number

CTrade trade;

struct SignalData {
   datetime time;
   string   direction;
   double   orderPrice;
   string   type;
   bool     executed;
};

SignalData signals[];
int totalSignals = 0;
int currentIndex = 0;

int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNum);
   
   string tfParam = "1h";
   if(InpTimeframe == TF_1M) tfParam = "1m";
   if(InpTimeframe == TF_5M) tfParam = "5m";
   if(InpTimeframe == TF_15M) tfParam = "15m";
   if(InpTimeframe == TF_30M) tfParam = "30m";
   
   string finalUrl = InpCsvUrl + "?tf=" + tfParam;
   Print("Initializing Heropips Bridge EA (Timeframe: " + tfParam + ")...");
   Print("Risk Percent: ", InpRiskPercent, "%");
   
   string cookie = "", headers = "";
   char post[], result[];
   string resultHeaders;
   
   // Request the CSV from the Utho Node.js Backend
   int res = WebRequest("GET", finalUrl, cookie, NULL, 5000, post, 0, result, resultHeaders);
   
   if(res == 200) {
      string csvContent = CharArrayToString(result);
      ParseCSV(csvContent);
   } else {
      Print("Failed to download CSV from ", finalUrl, ". Error: ", GetLastError(), " HTTP Code: ", res);
      return(INIT_FAILED);
   }
   return(INIT_SUCCEEDED);
  }

void OnTick()
  {
   if(currentIndex >= totalSignals) return; // All signals processed
   
   datetime currentServerTime = TimeCurrent();
   
   while(currentIndex < totalSignals && currentServerTime >= signals[currentIndex].time) {
      if(!signals[currentIndex].executed) {
         ExecuteSignal(currentIndex);
      }
      currentIndex++;
   }
  }

void ParseCSV(string content) {
   string lines[];
   int numLines = StringSplit(content, '\n', lines);
   ArrayResize(signals, numLines);
   totalSignals = 0;
   
   for(int i = 1; i < numLines; i++) { // Skip header
      if(StringLen(lines[i]) < 5) continue;
      string cols[];
      StringSplit(lines[i], ',', cols);
      if(ArraySize(cols) >= 4) {
         signals[totalSignals].time = StringToTime(cols[0]);
         signals[totalSignals].direction = cols[1];
         signals[totalSignals].orderPrice = StringToDouble(cols[2]);
         signals[totalSignals].type = cols[3];
         signals[totalSignals].executed = false;
         totalSignals++;
      }
   }
   Print("Successfully loaded ", totalSignals, " signals from Utho.");
}

void ExecuteSignal(int index) {
   double pipSize = SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10;
   if(StringFind(_Symbol, "JPY") >= 0 || StringFind(_Symbol, "XAU") >= 0) {
      pipSize = SymbolInfoDouble(_Symbol, SYMBOL_POINT) * 10;
   }
   
   double ask = SymbolInfoDouble(_Symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(_Symbol, SYMBOL_BID);
   
   // --- AUTO LOT SIZING LOGIC ---
   double lotSize = InpFixedLot;
   
   if(InpRiskPercent > 0) {
      double accountBalance = AccountInfoDouble(ACCOUNT_BALANCE);
      double riskAmount = accountBalance * (InpRiskPercent / 100.0);
      
      double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
      double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
      
      // Stop Loss distance in points
      double slPoints = InpStopLoss * 10; // Assuming 1 pip = 10 points
      
      if(slPoints > 0 && tickValue > 0 && tickSize > 0) {
         double pointValue = tickValue / (tickSize / SymbolInfoDouble(_Symbol, SYMBOL_POINT));
         double riskPerLot = slPoints * pointValue;
         
         if(riskPerLot > 0) {
            lotSize = riskAmount / riskPerLot;
            
            // Normalize lot size to broker steps
            double lotStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
            double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
            double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
            
            lotSize = MathRound(lotSize / lotStep) * lotStep;
            if(lotSize < minLot) lotSize = minLot;
            if(lotSize > maxLot) lotSize = maxLot;
         }
      }
   }
   // -----------------------------
   
   double sl = 0, tp = 0;
   
   if(signals[index].direction == "BUY") {
      sl = signals[index].orderPrice - (InpStopLoss * pipSize);
      tp = signals[index].orderPrice + (InpTakeProfit * pipSize);
      trade.BuyLimit(lotSize, signals[index].orderPrice, _Symbol, sl, tp, ORDER_TIME_GTC, 0, "Heropips AI V3");
   } 
   else if(signals[index].direction == "SELL") {
      sl = signals[index].orderPrice + (InpStopLoss * pipSize);
      tp = signals[index].orderPrice - (InpTakeProfit * pipSize);
      trade.SellLimit(lotSize, signals[index].orderPrice, _Symbol, sl, tp, ORDER_TIME_GTC, 0, "Heropips AI V3");
   }
   
   signals[index].executed = true;
}
