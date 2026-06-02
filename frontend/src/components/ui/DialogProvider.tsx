import React, { createContext, useContext, useState, type ReactNode } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';

type DialogType = 'alert' | 'confirm';

interface DialogOptions {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    showAuthButtons?: boolean;
}

interface DialogContextType {
    alert: (options: DialogOptions | string) => Promise<void>;
    confirm: (options: DialogOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) throw new Error('useDialog must be used within DialogProvider');
    return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dialogType, setDialogType] = useState<DialogType>('alert');
    const [options, setOptions] = useState<DialogOptions>({ title: '', message: '' });
    const [resolver, setResolver] = useState<{ resolve: (value: boolean | void) => void } | null>(null);

    const openDialog = (type: DialogType, opts: DialogOptions | string) => {
        return new Promise<any>((resolve) => {
            const defaultTitle = type === 'confirm' ? 'Confirmar' : 'Aviso';
            const finalOptions = typeof opts === 'string' ? { title: defaultTitle, message: opts, type: 'info' as const } : { type: 'info' as const, ...opts };
            setDialogType(type);
            setOptions(finalOptions);
            setResolver({ resolve });
            setIsOpen(true);
        });
    };

    const alert = (opts: DialogOptions | string) => openDialog('alert', opts) as Promise<void>;
    const confirm = (opts: DialogOptions | string) => openDialog('confirm', opts) as Promise<boolean>;

    const handleClose = (result: boolean) => {
        setIsOpen(false);
        if (resolver) {
            resolver.resolve(result);
            setResolver(null);
        }
    };

    const getIcon = () => {
        switch (options.type) {
            case 'warning': return <i className="pi pi-exclamation-triangle text-warning mb-3" style={{ fontSize: '3rem' }}></i>;
            case 'error': return <i className="pi pi-times-circle text-danger mb-3" style={{ fontSize: '3rem' }}></i>;
            case 'success': return <i className="pi pi-check-circle text-success mb-3" style={{ fontSize: '3rem' }}></i>;
            default: return <i className="pi pi-info-circle text-primary mb-3" style={{ fontSize: '3rem' }}></i>;
        }
    };

    const footer = (
        <div className="d-flex justify-content-center gap-2 mt-3">
            {options.showAuthButtons ? (
                <div className="d-flex flex-column gap-2 w-100">
                    <Button label="Iniciar Sesión" onClick={() => { handleClose(true); window.location.href = '/login'; }} className="p-button-primary w-100" />
                    <Button label="Registrarse" onClick={() => { handleClose(true); window.location.href = '/register'; }} className="p-button-secondary p-button-outlined w-100" />
                    <Button label="Quizás más tarde" onClick={() => handleClose(false)} className="p-button-text p-button-secondary w-100" />
                </div>
            ) : (
                <>
                    {dialogType === 'confirm' && (
                        <Button label="Cancelar" onClick={() => handleClose(false)} className="p-button-secondary p-button-outlined flex-grow-1" />
                    )}
                    <Button 
                        label={dialogType === 'confirm' ? 'Aceptar' : 'Entendido'} 
                        onClick={() => handleClose(true)} 
                        className={`flex-grow-1 ${options.type === 'error' || options.type === 'warning' ? 'p-button-danger' : 'p-button-primary'}`} 
                    />
                </>
            )}
        </div>
    );

    return (
        <DialogContext.Provider value={{ alert, confirm }}>
            {children}
            <Dialog 
                header={options.title} 
                visible={isOpen} 
                style={{ width: '90vw', maxWidth: '400px' }} 
                baseZIndex={10000}
                onHide={() => dialogType === 'confirm' ? handleClose(false) : handleClose(true)}
                footer={footer}
                className="text-center border-0 shadow-lg"
            >
                <div className="d-flex flex-column align-items-center text-center p-3">
                    {getIcon()}
                    <p className="m-0 fs-5 text-secondary">{options.message}</p>
                </div>
            </Dialog>
        </DialogContext.Provider>
    );
};
