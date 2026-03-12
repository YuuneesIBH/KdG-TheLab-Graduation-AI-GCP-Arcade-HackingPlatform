package Gui;

import java.awt.Dialog.ModalityType;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.imageio.ImageIO;
import javax.swing.JDialog;
import javax.swing.JOptionPane;
import main.GameFrame;
import main.GamePanel;
public class StartMenuPanel extends javax.swing.JPanel {

    private BufferedImage image;
    private GameFrame gameFrame;
    
    public StartMenuPanel(GameFrame gameFrame) {
        this.gameFrame = gameFrame;
        try {
            this.image = ImageIO.read( getClass().getResourceAsStream("/resources/cover.png"));
        } catch (IOException ex) {
            Logger.getLogger(StartMenuPanel.class.getName()).log(Level.SEVERE, null, ex);
        }
        initComponents();

    }
    @Override
    public void paint(Graphics g) {
        g.drawImage(image, 0, 0, getWidth(), getHeight(), this);
        super.paintChildren(g);
        g.dispose();
    }
    @SuppressWarnings("unchecked")
    private void initComponents() {

        singleplayerButton = new javax.swing.JButton();
        multiplayerButton = new javax.swing.JButton();
        quitButton = new javax.swing.JButton();
        jLabel1 = new javax.swing.JLabel();

        setMaximumSize(new java.awt.Dimension(1024, 768));
        setMinimumSize(new java.awt.Dimension(1024, 768));
        setPreferredSize(new java.awt.Dimension(1024, 768));
        setRequestFocusEnabled(false);

        singleplayerButton.setBackground(new java.awt.Color(141, 141, 141));
        singleplayerButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        singleplayerButton.setText("Singleplayer");
        singleplayerButton.setFocusPainted(false);
        singleplayerButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                singleplayerButtonActionPerformed(evt);
            }
        });

        multiplayerButton.setBackground(new java.awt.Color(141, 141, 141));
        multiplayerButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        multiplayerButton.setText("Multiplayer");
        multiplayerButton.setFocusPainted(false);
        multiplayerButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                multiplayerButtonActionPerformed(evt);
            }
        });

        quitButton.setBackground(new java.awt.Color(141, 141, 141));
        quitButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        quitButton.setText("Quit");
        quitButton.setFocusPainted(false);
        quitButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                quitButtonActionPerformed(evt);
            }
        });

        jLabel1.setBackground(new java.awt.Color(213, 216, 219));
        jLabel1.setFont(new java.awt.Font("URW Gothic L", 1, 36));
        jLabel1.setHorizontalAlignment(javax.swing.SwingConstants.CENTER);
        jLabel1.setText("RACE GAME");
        jLabel1.setToolTipText("");
        jLabel1.setAlignmentX(0.5F);
        jLabel1.setOpaque(true);

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(this);
        this.setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addContainerGap(384, Short.MAX_VALUE)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING, false)
                    .addComponent(singleplayerButton, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(multiplayerButton, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(quitButton, javax.swing.GroupLayout.DEFAULT_SIZE, javax.swing.GroupLayout.DEFAULT_SIZE, Short.MAX_VALUE)
                    .addComponent(jLabel1, javax.swing.GroupLayout.DEFAULT_SIZE, 255, Short.MAX_VALUE))
                .addContainerGap(385, Short.MAX_VALUE))
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(layout.createSequentialGroup()
                .addGap(54, 54, 54)
                .addComponent(jLabel1, javax.swing.GroupLayout.PREFERRED_SIZE, 69, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(136, 136, 136)
                .addComponent(singleplayerButton, javax.swing.GroupLayout.PREFERRED_SIZE, 63, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(30, 30, 30)
                .addComponent(multiplayerButton, javax.swing.GroupLayout.PREFERRED_SIZE, 63, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(30, 30, 30)
                .addComponent(quitButton, javax.swing.GroupLayout.PREFERRED_SIZE, 63, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addContainerGap(260, Short.MAX_VALUE))
        );
    }

    private void multiplayerButtonActionPerformed(java.awt.event.ActionEvent evt) {
        MultiplayerDialog dialog = new MultiplayerDialog(gameFrame, true, gameFrame);
        dialog.setModalityType(ModalityType.APPLICATION_MODAL);
        dialog.setDefaultCloseOperation(JDialog.DISPOSE_ON_CLOSE);
        dialog.setLocationRelativeTo(this);
        dialog.setVisible(true);
        
    }

    private void quitButtonActionPerformed(java.awt.event.ActionEvent evt) {
        System.exit(0);
    }

    private void singleplayerButtonActionPerformed(java.awt.event.ActionEvent evt) {
        gameFrame.startGame(new GamePanel(gameFrame, false, false, null, null, 0));
    }
    private javax.swing.JLabel jLabel1;
    private javax.swing.JButton multiplayerButton;
    private javax.swing.JButton quitButton;
    private javax.swing.JButton singleplayerButton;
}
