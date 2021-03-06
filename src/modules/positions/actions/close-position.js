import { createBigNumber } from "utils/create-big-number";
import { updateTradesInProgress } from "modules/trades/actions/update-trades-in-progress";
import { placeTrade } from "modules/trades/actions/place-trade";
import { addClosePositionTradeGroup } from "modules/positions/actions/add-close-position-trade-group";
import { clearClosePositionOutcome } from "modules/positions/actions/clear-close-position-outcome";
import { selectMarket } from "modules/markets/selectors/market";
import loadBidsAsks from "modules/orders/actions/load-bids-asks";
import { BUY, SELL } from "modules/transactions/constants/types";
import {
  CLOSE_DIALOG_FAILED,
  CLOSE_DIALOG_NO_ORDERS
} from "modules/markets/constants/close-dialog-status";
import { ZERO } from "modules/trades/constants/numbers";
import getValue from "utils/get-value";
import logError from "utils/log-error";

export function closePosition(marketId, outcomeId, callback = logError) {
  return (dispatch, getState) => {
    // Lock trading + update close position status
    dispatch(addClosePositionTradeGroup(marketId, outcomeId, ""));

    // Load order book + execute trade if possible
    dispatch(
      loadBidsAsks(marketId, err => {
        if (err) return callback(err);
        const { orderBooks, loginAccount } = getState();
        const market = selectMarket(marketId);
        const positionOutcome = market
          ? (market.outcomes || []).find(
              outcome => parseInt(outcome.id, 10) === parseInt(outcomeId, 10)
            )
          : null;
        const positionShares = createBigNumber(
          getValue(positionOutcome, "position.netPosition.fullPrecision") || "0"
        );
        const userAddress = loginAccount.address;
        const bestFill = getBestFill(
          (orderBooks[marketId] || {})[outcomeId] || {},
          positionShares.gt(ZERO) ? BUY : SELL,
          positionShares.absoluteValue(),
          marketId,
          outcomeId,
          userAddress
        );
        if (bestFill.amountOfShares.isEqualTo(ZERO)) {
          dispatch(clearClosePositionOutcome(marketId, outcomeId));
          dispatch(
            addClosePositionTradeGroup(
              marketId,
              outcomeId,
              CLOSE_DIALOG_NO_ORDERS
            )
          );
        } else {
          dispatch(
            updateTradesInProgress({
              marketId,
              outcomeId,
              side: positionShares.gt(ZERO) ? SELL : BUY,
              numShares: bestFill.amountOfShares.toFixed(),
              limitPrice: bestFill.price.toNumber(),
              maxCost: null,
              callback: (err, tradesInProgress) => {
                dispatch(
                  placeTrade({
                    marketId,
                    outcomeId,
                    tradeInProgress: tradesInProgress,
                    doNotCreateOrders: true,
                    callback: (err, tradeGroupId) => {
                      if (err) {
                        console.error("placeTrade err -- ", err);
                        dispatch(
                          addClosePositionTradeGroup(
                            marketId,
                            outcomeId,
                            CLOSE_DIALOG_FAILED
                          )
                        );
                      } else {
                        dispatch(
                          addClosePositionTradeGroup(
                            marketId,
                            outcomeId,
                            tradeGroupId
                          )
                        );
                      }
                    }
                  })
                );
              }
            })
          );
        }
      })
    );
  };
}

export function getBestFill(
  orderBook,
  side,
  shares,
  marketId,
  outcomeId,
  userAddress
) {
  let price = ZERO;
  let amountOfShares = ZERO;
  Object.keys(orderBook[side] || {})
    .reduce((p, orderId) => {
      const orderOutcome = getValue(orderBook, `${side}.${orderId}`);
      if (orderOutcome.owner !== userAddress) p.push(orderOutcome);
      return p;
    }, [])
    .sort((a, b) => {
      const aBN = createBigNumber(a.fullPrecisionPrice);
      const bBN = createBigNumber(b.fullPrecisionPrice);
      if (side === BUY) return bBN.minus(aBN);
      return aBN.minus(bBN);
    })
    .find(order => {
      amountOfShares = amountOfShares.plus(
        createBigNumber(order.fullPrecisionAmount)
      );
      price = createBigNumber(order.fullPrecisionPrice);
      if (amountOfShares.gte(shares)) {
        amountOfShares = shares;
        return true;
      }
      return false;
    });
  return { amountOfShares, price };
}
