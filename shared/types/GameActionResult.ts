import type { GameActionName, GameErrorCode } from './GameError';

export type GameActionResult<T = undefined> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: GameErrorCode;
        message: string;
        action: GameActionName;
      };
    };

export function actionSuccess<T>(data: T): GameActionResult<T> {
  return {
    success: true,
    data,
  };
}

export function actionFailure(
  code: GameErrorCode,
  message: string,
  action: GameActionName,
): GameActionResult<never> {
  return {
    success: false,
    error: {
      code,
      message,
      action,
    },
  };
}
