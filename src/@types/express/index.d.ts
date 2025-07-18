declare global {
  namespace Express {
    interface User {
      id?: string;
      workspaceMembership?: any;
      [key: string]: any;
    }
    interface Request {
      workspace?: {
        [key: string]: any;
        subscriptions?: any[];
        id?: string;
      };
      workspaceMembership?: any;
      subscription?: any;
    }
  }
}

export {};
