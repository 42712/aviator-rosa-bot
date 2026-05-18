(function () {
                    const arr = JSON.parse(data);

                    arr.forEach(msg => {

                        console.log('📦 FRAME:', msg);

                        processMessage(msg);

                    });

                } else {

                    processMessage(data);

                }

            } catch (e) {

                console.warn('[MEGATRON] erro ws:', e);

            }

        });

        return ws;

    };

    // FALLBACK DOM
    setInterval(() => {

        try {

            const payouts = document.querySelectorAll('.payout');

            if (!payouts.length) return;

            const last = payouts[0];

            const txt = last.innerText.trim();

            const mult = parseFloat(txt.replace('x', ''));

            if (!isNaN(mult) && mult !== lastMultiplier) {

                lastMultiplier = mult;

                const payload = {
                    type: 'DOM_FALLBACK',
                    multiplier: mult,
                    round: lastRound,
                    time: getTimeNow()
                };

                console.log('🟣 DOM:', payload);

                sendData(payload);

            }

        } catch (e) {}

    }, 1000);

})();
