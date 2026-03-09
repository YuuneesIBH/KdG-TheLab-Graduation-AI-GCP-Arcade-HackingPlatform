package Gui;
public class PauseMenu extends javax.swing.JPanel {
    private PauseMenuDialog pauseMenuDialog;
    public PauseMenu(PauseMenuDialog pauseMenuDialog) {
        this.pauseMenuDialog = pauseMenuDialog;
        initComponents();
    }
    @SuppressWarnings("unchecked")
    private void initComponents() {

        optionsButton = new javax.swing.JButton();
        goToMenuButton = new javax.swing.JButton();
        resumeButton = new javax.swing.JButton();

        setBackground(new java.awt.Color(210, 211, 212));
        setMaximumSize(new java.awt.Dimension(400, 300));
        setMinimumSize(new java.awt.Dimension(400, 300));
        setPreferredSize(new java.awt.Dimension(400, 300));

        optionsButton.setBackground(new java.awt.Color(141, 141, 141));
        optionsButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        optionsButton.setText("Options");
        optionsButton.setFocusPainted(false);
        optionsButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                optionsButtonActionPerformed(evt);
            }
        });

        goToMenuButton.setBackground(new java.awt.Color(141, 141, 141));
        goToMenuButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        goToMenuButton.setText("Go to menu");
        goToMenuButton.setFocusPainted(false);
        goToMenuButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                goToMenuButtonActionPerformed(evt);
            }
        });

        resumeButton.setBackground(new java.awt.Color(141, 141, 141));
        resumeButton.setFont(new java.awt.Font("URW Gothic L", 1, 18));
        resumeButton.setText("Resume");
        resumeButton.setFocusPainted(false);
        resumeButton.addActionListener(new java.awt.event.ActionListener() {
            public void actionPerformed(java.awt.event.ActionEvent evt) {
                resumeButtonActionPerformed(evt);
            }
        });

        javax.swing.GroupLayout layout = new javax.swing.GroupLayout(this);
        this.setLayout(layout);
        layout.setHorizontalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                .addGap(0, 82, Short.MAX_VALUE)
                .addGroup(layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
                    .addComponent(resumeButton, javax.swing.GroupLayout.PREFERRED_SIZE, 236, javax.swing.GroupLayout.PREFERRED_SIZE)
                    .addComponent(goToMenuButton, javax.swing.GroupLayout.PREFERRED_SIZE, 236, javax.swing.GroupLayout.PREFERRED_SIZE)
                    .addComponent(optionsButton, javax.swing.GroupLayout.PREFERRED_SIZE, 236, javax.swing.GroupLayout.PREFERRED_SIZE))
                .addGap(82, 82, 82))
        );
        layout.setVerticalGroup(
            layout.createParallelGroup(javax.swing.GroupLayout.Alignment.LEADING)
            .addGroup(javax.swing.GroupLayout.Alignment.TRAILING, layout.createSequentialGroup()
                .addContainerGap(63, Short.MAX_VALUE)
                .addComponent(optionsButton, javax.swing.GroupLayout.PREFERRED_SIZE, 46, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(goToMenuButton, javax.swing.GroupLayout.PREFERRED_SIZE, 46, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(18, 18, 18)
                .addComponent(resumeButton, javax.swing.GroupLayout.PREFERRED_SIZE, 46, javax.swing.GroupLayout.PREFERRED_SIZE)
                .addGap(63, 63, 63))
        );
    }

    private void goToMenuButtonActionPerformed(java.awt.event.ActionEvent evt) {
        pauseMenuDialog.getGameFrame().goToMenu(pauseMenuDialog.getGamePanel());
        pauseMenuDialog.getGamePanel().finish();
        pauseMenuDialog.dispose();
    }

    private void optionsButtonActionPerformed(java.awt.event.ActionEvent evt) {
        pauseMenuDialog.changePanel();
    }

    private void resumeButtonActionPerformed(java.awt.event.ActionEvent evt) {
        pauseMenuDialog.dispose();
        pauseMenuDialog.getGamePanel().pauseOrResume();
    }
    private javax.swing.JButton goToMenuButton;
    private javax.swing.JButton optionsButton;
    private javax.swing.JButton resumeButton;
}
