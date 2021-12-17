import React, { useEffect, useState } from 'react';
import { Button, Drawer, Classes, Position } from '@blueprintjs/core';

import Let from './let';
import '../../scss/Let.scss';
import { letDrawerProps } from '../../interfaces/interfaces';
import { useAppSelector } from '../../store/hooks';
import { selectTheme } from '../../store/features/theme/themeSlice';
import { selectLetMap } from '../../store/features/proof/proofSlice';

const indent = (s: string) => {
    let newS = s.replaceAll(' ', '\n');
    let i = 0;
    let pCounter = 0;
    while (i < newS.length) {
        if (newS[i] === '(') pCounter++;
        else if (newS[i] === ')') pCounter--;
        else if (newS[i] === '\n') {
            if (newS[i + 1] === ')') {
                newS = [newS.slice(0, i + 1), '    '.repeat(pCounter - 1), newS.slice(i + 1)].join('');
                i += pCounter - 1;
            } else {
                newS = [newS.slice(0, i + 1), '    '.repeat(pCounter), newS.slice(i + 1)].join('');
                i += pCounter;
            }
        }
        i++;
    }
    return newS;
};

const VisualizerLetDrawer: React.FC<letDrawerProps> = ({ drawerIsOpen, setDrawerIsOpen }: letDrawerProps) => {
    const darkTheme = useAppSelector(selectTheme);
    const letMap = useAppSelector(selectLetMap);
    const [letMapS, setLetMapS] = useState(letMap);
    const [width, setWidth] = useState(0);
    const [lets, setLets] = useState<{ [key: string]: Let }>({});

    // ComponentDidMount
    useEffect(() => {
        // Handler to call on window resize and set the value column width
        function handleResize() {
            // -22 from the fixed padding size
            setWidth(document.getElementsByClassName('letMap-value-column')[0].clientWidth - 22);
        }

        // Add event listener
        window.addEventListener('resize', handleResize);
        // Call handler right away so state gets updated with initial window size
        handleResize();

        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const expandLet = (key: string) => {
        // Only when is shrinked
        if (!lets[key].isExpanded) {
            lets[key].isExpanded = true;
            const newLetMap = { ...letMapS };
            newLetMap[lets[key].name] = lets[key].expandValue();
            setLetMapS(newLetMap);
        }
    };

    const revertLet = (key: string) => {
        // Only when is expanded
        if (lets[key].isExpanded) {
            lets[key].isExpanded = false;
            const newLetMap = { ...letMapS };
            newLetMap[key] = letMap[key];
            setLetMapS(newLetMap);
        }
    };

    const renderLet = (key: string): JSX.Element => {
        // Waits for the width to be updated and the DOM element to be updated
        if (width) {
            let currentLet = letMapS[key];

            let indices: { [key: number]: string } = {};
            // Finds all occurences of let in the currentLet
            [...currentLet.matchAll(/let\d+/g)].forEach((match) => {
                if (match.index) indices[match.index] = match[0];
            });

            // If it's the first render (make sure that the lets obj is not calculated every time)
            if (Object.keys(lets).length !== Object.keys(letMapS).length) {
                lets[key] = new Let(key, currentLet, lets, indices);
            }

            // If doesn't fits, then indent
            if (!lets[key].fitsTheWindow(width)) {
                currentLet = indent(letMapS[key]);

                indices = {};
                // Finds all occurences of let in the currentLet after indentation
                [...currentLet.matchAll(/let\d+/g)].forEach((match) => {
                    if (match.index) indices[match.index] = match[0];
                });
            }

            const arr: any = [];
            let start = 0;
            // Slice the currentLet into an array with strings and JSX elements
            Object.keys(indices).forEach((index, i, self) => {
                const idx = Number(index);
                const thisLet = indices[idx];

                // Add the elements to the arr
                arr.push(currentLet.substring(start, idx));
                arr.push(<a className={darkTheme ? 'let-literal-or' : 'let-literal'}>{thisLet}</a>);
                // Defines a new start
                start = idx + thisLet.length;

                // If it's the last let
                if (i === self.length - 1) {
                    arr.push(currentLet.substring(start, currentLet.length));
                }
            });

            // If there is a let in this current let
            if (Object.keys(indices).length) {
                return (
                    <span
                        className="let-instance"
                        onClick={() => {
                            expandLet(key);
                        }}
                    >
                        {arr}
                    </span>
                );
            } else {
                return <span>{currentLet}</span>;
            }
        }
        return <></>;
    };

    return (
        <Drawer
            className={darkTheme ? 'bp3-dark' : ''}
            style={{ maxHeight: '65%', width: '35%' }}
            autoFocus={true}
            canEscapeKeyClose={true}
            canOutsideClickClose={false}
            enforceFocus={true}
            hasBackdrop={false}
            isOpen={drawerIsOpen}
            position={Position.RIGHT}
            usePortal={false}
            onClose={(e) => {
                e.preventDefault();
                setDrawerIsOpen(false);
            }}
            icon="translate"
            title="Let Map"
        >
            <div className={Classes.DRAWER_BODY}>
                <div className={Classes.DIALOG_BODY}>
                    <table
                        id="table-node-info"
                        className="bp3-html-table bp3-html-table-bordered bp3-html-table-condensed bp3-html-table-striped"
                        style={{ width: '100%' }}
                    >
                        <thead>
                            <tr>
                                <th style={{ width: '100px' }}>Property</th>
                                <th className="letMap-value-column">Value</th>
                                <th style={{ width: '250px' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(letMapS).map((key) => {
                                return (
                                    <tr key={key}>
                                        <td>
                                            <strong>{key}</strong>
                                        </td>
                                        <td style={{ width: '100%', whiteSpace: 'pre-wrap' }}>{renderLet(key)}</td>
                                        <td style={{ width: '150px', height: '100%' }}>
                                            <Button
                                                onClick={() => expandLet(key)}
                                                className="bp3-minimal"
                                                icon="translate"
                                                text="Expand"
                                            />
                                            <Button
                                                onClick={() => revertLet(key)}
                                                className="bp3-minimal"
                                                icon="undo"
                                                text="Revert"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </Drawer>
    );
};

export default VisualizerLetDrawer;
