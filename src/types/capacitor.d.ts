declare module "@capacitor/share" {
  export const Share: {
    share(options: {
      title?: string
      text?: string
      url?: string
      dialogTitle?: string
    }): Promise<void>
  }
}

declare module "@capacitor/local-notifications" {
  export const LocalNotifications: {
    requestPermissions(): Promise<{ display: string }>
    schedule(options: {
      notifications: Array<{
        id: number
        title: string
        body: string
        schedule?: { at: Date }
        sound?: string
      }>
    }): Promise<void>
    getPending(): Promise<{
      notifications: Array<{ id: number }>
    }>
    cancel(options: { notifications: Array<{ id: number }> }): Promise<void>
  }
}
