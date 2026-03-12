package Gui;

import java.awt.Color;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import javax.swing.JTextField;
import javax.swing.Timer;
import main.GamePanel;
public class SoloInfoPanel extends javax.swing.JPanel implements InfoPanel{
    private GamePanel gamePanel;
    boolean network;
    public SoloInfoPanel(GamePanel gamePanel) {
        initComponents();
        this.gamePanel = gamePanel;
    }
    @SuppressWarnings("unchecked")
    private void initComponents() {

        jLabel2 = new javax.swing.JLabel();
        jLabel4 = new javax.swing.JLabel();
        pauseButton = new javax.swing.JButton();
        velocimeter = new javax.swing.JTextField();
        lapTimer = new javax.swing.JTextField();
        fastLapTime = new javax.swing.JTextField();
        jLabel1 = new javax.swing.JLabel();
        jLabel3 = new javax.swing.JLabel();
        jLabel5 = new javax.swing.JLabel();
        fps = new javax.swing.JLabel();

        jLabel2.setText("Lap Time:");

        jLabel4.setText("Speed:");

        setFocusable(false);
        setMaximumSize(new java.awt.Dimension(1024, 60));
        setMinimumSize(new java.awt.Dimension(1024, 60));
        setOpaque(false);
        setRequestFocusEnabled(false);

        pauseButton.setBackground(new java.awt.Color(141, 141, 141));
        pauseButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        pauseButton.setIcon(new javax.swing.ImageIcon(getClass().getResource("/resources/pause2.png")));
        pauseButton.setText("Pause");
        pauseButton.setFocusPainted(false);
        pauseButton.setFocusable(false);
        pauseButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                pauseButtonActionPerformed(evt);
            }
        });

        velocimeter.setEditable(false);
        velocimeter.setBackground(new java.awt.Color(141, 141, 141));
        velocimeter.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        velocimeter.setHorizontalAlignment(javax.swing.JTextField.CENTER);
        velocimeter.setText("15  km/h");
        velocimeter.setToolTipText("");
        velocimeter.setBorder(javax.swing.BorderFactory.createEmptyBorder(1, 1, 1, 1));
        velocimeter.setFocusable(false);
        velocimeter.setRequestFocusEnabled(false);
        velocimeter.setSelectionColor(new Color(0,0, 0, 0));
        velocimeter.setVerifyInputWhenFocusTarget(false);
        velocimeter.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                velocimeterActionPerformed(evt);
            }
        });

        lapTimer.setEditable(false);
        lapTimer.setBackground(new java.awt.Color(141, 141, 141));
        lapTimer.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        lapTimer.setHorizontalAlignment(javax.swing.JTextField.CENTER);
        lapTimer.setToolTipText("");
        lapTimer.setBorder(javax.swing.BorderFactory.createEmptyBorder(1, 1, 1, 1));
        lapTimer.setFocusable(false);
        lapTimer.setRequestFocusEnabled(false);
        lapTimer.setSelectionColor(new Color(0,0, 0, 0));
        lapTimer.setVerifyInputWhenFocusTarget(false);
        lapTimer.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                lapTimerActionPerformed(evt);
            }
        });

        fastLapTime.setEditable(false);
        fastLapTime.setBackground(new java.awt.Color(141, 141, 141));
        fastLapTime.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        fastLapTime.setHorizontalAlignment(javax.swing.JTextField.CENTER);
        fastLapTime.setText("--:--:--");
        fastLapTime.setToolTipText("");
        fastLapTime.setBorder(javax.swing.BorderFactory.createEmptyBorder(1, 1, 1, 1));
        fastLapTime.setFocusable(false);
        fastLapTime.setRequestFocusEnabled(false);
        fastLapTime.setSelectionColor(new Color(0,0, 0, 0));
        fastLapTime.setVerifyInputWhenFocusTarget(false);
        fastLapTime.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                fastLapTimeActionPerformed(evt);
            }
        });

        jLabel1.setText("Lap Time");

        jLabel3.setText("Speed");

        jLabel5.setText("Fastest Lap");

        fps.setFont(new java.awt.Font("URW Bookman L", 1, 14));
        fps.setForeground(new java.awt.Color(30, 30, 30));
        fps.setText("60 FPS");

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(this);
        this.setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                .addContainerGap()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addComponent(velocimeter, javax.swing.GroupLayout.PREFERRED_SIZE, 112, javax.swing.GroupLayout.PREFERRED_SIZE)
                    .addComponent(jLabel3))
                .addGap(36, 36, 36)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(layout.createSequentialGroup()
                        .addComponent(jLabel5)
                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                        .addComponent(pauseButton, javax.swing.GroupLayout.PREFERRED_SIZE, 134, javax.swing.GroupLayout.PREFERRED_SIZE))
                    .addGroup(layout.createSequentialGroup()
                        .addComponent(fastLapTime, javax.swing.GroupLayout.PREFERRED_SIZE, 112, javax.swing.GroupLayout.PREFERRED_SIZE)
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                            .addGroup(layout.createSequentialGroup()
                                .addGap(217, 217, 217)
                                .addComponent(jLabel1)
                                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED, 277, Short.MAX_VALUE)
                                .addComponent(fps)
                                .addGap(152, 152, 152))
                            .addGroup(layout.createSequentialGroup()
                                .addGap(196, 196, 196)
                                .addComponent(lapTimer, javax.swing.GroupLayout.PREFERRED_SIZE, 114, javax.swing.GroupLayout.PREFERRED_SIZE)))))
                .addContainerGap())
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap()
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addGroup(layout.createSequentialGroup()
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                            .addComponent(jLabel3)
                            .addComponent(jLabel5))
                        .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING, false)
                            .addComponent(fastLapTime, javax.swing.GroupLayout.PREFERRED_SIZE, 38, javax.swing.GroupLayout.PREFERRED_SIZE)
                            .addComponent(velocimeter))
                        .addContainerGap(javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE))
                    .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                        .addGap(0, 0, Short.MAX_VALUE)
                        .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.BASELINE)
                                    .addComponent(pauseButton)
                                    .addComponent(fps))
                                .addGap(57, 57, 57))
                            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                                .addComponent(jLabel1)
                                .addPreferredGap(javax.swing.LayoutStyle.ComponentPlacement.RELATED)
                                .addComponent(lapTimer, javax.swing.GroupLayout.PREFERRED_SIZE, 38, javax.swing.GroupLayout.PREFERRED_SIZE)
                                .addContainerGap())))))
        );
    }

    private void pauseButtonActionPerformed(java.awt.event.ActionEvent evt) {
        gamePanel.pauseOrResume();
        gamePanel.initPauseDialog();
    }

    private void velocimeterActionPerformed(java.awt.event.ActionEvent evt) {
    }

    private void fastLapTimeActionPerformed(java.awt.event.ActionEvent evt) {
    }

    private void lapTimerActionPerformed(java.awt.event.ActionEvent evt) {
    }

    public void update() {
        updateCounter(lapTimer, gamePanel.getLapSeconds());
        updateVelocimeter();
        fps.setText(gamePanel.getFPS() + " FPS");
    }
    
    private void updateVelocimeter() {
        velocimeter.setText(String.format("%.2f",
                gamePanel.getPlayer().getSpeed() /
                        gamePanel.getPlayer().getMaxSpeed() * 160) + " km/h");
    }
    private void updateCounter(JTextField counter, float seconds) {
        int minutes = (int) (seconds / 60);
        int secs = (int) (seconds % 60);
        int rest = (int) ((seconds - secs) * 100);
        counter.setText(String.format("%02d:%02d:%02d", minutes,secs, rest));
    }
    public void updateFastestLapCounter() {
        Timer timer = new Timer(4000, new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                fastLapTime.setForeground(new Color(51, 51, 51));
            }
        });
        timer.setRepeats(false); 
        timer.start();
        fastLapTime.setForeground(new Color(215, 6, 149));
        updateCounter(fastLapTime, gamePanel.getFastestLap());
    }
    private javax.swing.JTextField fastLapTime;
    private javax.swing.JLabel fps;
    private javax.swing.JLabel jLabel1;
    private javax.swing.JLabel jLabel2;
    private javax.swing.JLabel jLabel3;
    private javax.swing.JLabel jLabel4;
    private javax.swing.JLabel jLabel5;
    private javax.swing.JTextField lapTimer;
    private javax.swing.JButton pauseButton;
    private javax.swing.JTextField velocimeter;
}
