import 'express';

declare module 'express-serve-static-core' {
  interface Request {
    workspace?: unknown;
    workspaceMembership?: unknown;
  }
}
