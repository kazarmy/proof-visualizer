import React, { useEffect, useReducer, useState } from 'react';

import { Intent, Position, Toaster } from '@blueprintjs/core';

import VisualizerNavbar from '../VisualizerNavbar/VisualizerNavbar';
import VisualizerDialog from '../VisualizerDialog/VisualizerDialog';
import VisualizerStage from '../VisualizerStage/VisualizerStage';
import VisualizersDrawer from '../VisualizersDrawer/VisualizersDrawer';

import { useAppSelector } from '../../store/hooks';
import { selectTheme } from '../../store/features/theme/themeSlice';
import VisualizerTutorial from '../VisualizerTutorial/VisualizerPanel';

const App: React.FC = () => {
    const [dialogIsOpen, setDialogIsOpen] = useState(true);
    const [inTutorial, setInTutorial] = useState(false);
    const [drawerIsOpen, setDrawerOpenState] = useReducer((isOpen) => !isOpen, false);
    const darkTheme = useAppSelector(selectTheme);

    // Toaster
    let toaster: Toaster;
    const refHandlers = {
        toaster: (ref: Toaster) => (toaster = ref),
    };

    const addErrorToast = (err: string) => {
        toaster.show({ icon: 'warning-sign', intent: Intent.DANGER, message: err });
    };

    useEffect(() => {
        document.getElementsByClassName('bp3-overlay')[0]
            ? (document.getElementsByClassName('bp3-overlay')[0].className = '')
            : null;
    }, [drawerIsOpen]);

    return (
        <div className={darkTheme ? ' bp3-dark' : ''} style={{ height: '100%' }}>
            <VisualizerTutorial inTutorial={inTutorial} setInTutorial={setInTutorial} />
            <Toaster position={Position.TOP} ref={refHandlers.toaster} />
            <VisualizerNavbar
                setDialogIsOpen={setDialogIsOpen}
                setDrawerIsOpen={setDrawerOpenState}
                addErrorToast={addErrorToast}
                inTutorial={inTutorial}
                setInTutorial={setInTutorial}
            ></VisualizerNavbar>
            <VisualizerDialog
                dialogIsOpen={dialogIsOpen}
                setDialogIsOpen={setDialogIsOpen}
                addErrorToast={addErrorToast}
            ></VisualizerDialog>
            <VisualizerStage></VisualizerStage>
            {drawerIsOpen ? (
                <VisualizersDrawer drawerIsOpen={drawerIsOpen} setDrawerIsOpen={setDrawerOpenState}></VisualizersDrawer>
            ) : null}
        </div>
    );
};

export default App;
